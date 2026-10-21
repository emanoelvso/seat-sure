import { createHmac } from 'crypto';
import Stripe from 'stripe';
import {
  AttachResult,
  AuthorizeInput,
  AuthorizeResult,
  CustomerPaymentMethods,
  GatewayPayment,
  PaymentGateway,
  TokenizeResult,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingCustomer } from '@billingModule/persistence/entity/billing-customer.entity';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';

const isCardError = (error: unknown): boolean =>
  (error as { type?: string } | null)?.type === 'StripeCardError';

const isResourceMissing = (error: unknown): boolean =>
  (error as { type?: string; code?: string } | null)?.type ===
    'StripeInvalidRequestError' &&
  (error as { code?: string }).code === 'resource_missing';

const isInvalidRequest = (error: unknown): boolean =>
  (error as { type?: string } | null)?.type === 'StripeInvalidRequestError';

// Stripe test-mode adapter (GW-33..GW-40). Every money-moving call carries the
// caller's idempotency key. A card error is a decline; any other error
// (network, auth, rate limit) throws so the order is released (GW-40).
export class StripePaymentGateway implements PaymentGateway {
  readonly provider = 'stripe' as const;
  readonly acceptsTypedCards = false;

  constructor(
    private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly customers: BillingCustomerRepository,
  ) {}

  // Stripe cards are collected by Elements in the browser as a PaymentMethod
  async tokenize(): Promise<TokenizeResult> {
    throw new Error('Typed cards are not supported by the Stripe gateway');
  }

  // Attaches the browser-made PaymentMethod to the user's Stripe Customer
  // (created once per user) and reads the display data from Stripe. The
  // fingerprint is a keyed HMAC of Stripe's own card fingerprint (AD-026).
  async attachPaymentMethod(
    paymentMethodId: string,
    userId: string,
  ): Promise<AttachResult> {
    const customerId = await this.customerOf(userId);

    let method: Stripe.PaymentMethod;
    try {
      method = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      if (isCardError(error)) {
        return { status: 'failed', reason: 'card_declined' };
      }
      throw error;
    }

    const card = method.card;
    if (!card) {
      throw new Error('Stripe payment method is not a card');
    }

    return {
      status: 'succeeded',
      token: method.id,
      customerId,
      fingerprint: createHmac(
        'sha256',
        this.configService.get('billing.fingerprintSecret'),
      )
        .update(card.fingerprint ?? method.id)
        .digest('hex'),
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      holder: (method.billing_details?.name ?? '').trim().slice(0, 50),
    };
  }

  async describePaymentMethod(
    paymentMethodId: string,
  ): Promise<{ brand: string; last4: string }> {
    const method = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    if (!method.card) {
      throw new Error('Stripe payment method is not a card');
    }
    return { brand: method.card.brand, last4: method.card.last4 };
  }

  // Stripe documents no error code for "not attached", so an invalid-request
  // error is settled by reading the method: no customer means it is detached
  async detach(token: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(token);
    } catch (error) {
      if (isResourceMissing(error)) {
        return;
      }
      if (!isInvalidRequest(error)) {
        throw error;
      }
      if (await this.isDetached(token)) {
        return;
      }
      throw error;
    }
  }

  async listCustomerPaymentMethods(
    customerId: string,
  ): Promise<CustomerPaymentMethods> {
    try {
      const methods: { token: string; createdAt: Date }[] = [];
      for await (const method of this.stripe.customers.listPaymentMethods(
        customerId,
        { type: 'card', limit: 100 },
      )) {
        methods.push({
          token: method.id,
          createdAt: new Date(method.created * 1000),
        });
      }
      return { status: 'found', methods };
    } catch (error) {
      if (isResourceMissing(error)) {
        return { status: 'missing' };
      }
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
    } catch (error) {
      if (!isResourceMissing(error)) {
        throw error;
      }
    }
  }

  async authorize(
    { amountCents, currency, source }: AuthorizeInput,
    key: string,
  ): Promise<AuthorizeResult> {
    if (source.type !== 'token') {
      throw new Error('Typed cards are not supported by the Stripe gateway');
    }

    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: currency.toLowerCase(),
          payment_method: source.token,
          ...(source.customerId ? { customer: source.customerId } : {}),
          confirm: true,
          capture_method: 'manual',
          allowed_payment_method_types: ['card'],
        },
        { idempotencyKey: key },
      );

      return this.authorizeResultOf(intent);
    } catch (error) {
      if (isCardError(error)) {
        return { status: 'failed', reason: 'card_declined' };
      }
      throw error;
    }
  }

  async getPayment(providerPaymentId: string): Promise<GatewayPayment> {
    const intent = await this.stripe.paymentIntents.retrieve(providerPaymentId);

    switch (intent.status) {
      case 'requires_capture':
        return { status: 'authorized' };
      case 'requires_action':
        return {
          status: 'requires_action',
          clientSecret: this.secretOf(intent),
        };
      case 'requires_payment_method':
        return { status: 'authentication_failed' };
      case 'canceled':
        return { status: 'cancelled' };
      case 'succeeded':
        return { status: 'captured' };
      default:
        throw new Error(`Unexpected Stripe payment status: ${intent.status}`);
    }
  }

  async capture(providerPaymentId: string, key: string): Promise<void> {
    await this.stripe.paymentIntents.capture(
      providerPaymentId,
      {},
      { idempotencyKey: key },
    );
  }

  async cancel(providerPaymentId: string, key: string): Promise<void> {
    await this.stripe.paymentIntents.cancel(
      providerPaymentId,
      {},
      { idempotencyKey: key },
    );
  }

  async refund(providerPaymentId: string, key: string): Promise<void> {
    await this.stripe.refunds.create(
      { payment_intent: providerPaymentId },
      { idempotencyKey: key },
    );
  }

  private async isDetached(token: string): Promise<boolean> {
    try {
      const method = await this.stripe.paymentMethods.retrieve(token);
      return method.customer === null;
    } catch (error) {
      return isResourceMissing(error);
    }
  }

  private authorizeResultOf(intent: Stripe.PaymentIntent): AuthorizeResult {
    switch (intent.status) {
      case 'requires_capture':
        return { status: 'authorized', providerPaymentId: intent.id };
      case 'requires_action':
        return {
          status: 'requires_action',
          providerPaymentId: intent.id,
          clientSecret: this.secretOf(intent),
        };
      case 'requires_payment_method':
        return { status: 'failed', reason: 'card_declined' };
      default:
        throw new Error(`Unexpected Stripe payment status: ${intent.status}`);
    }
  }

  private secretOf(intent: Stripe.PaymentIntent): string {
    if (!intent.client_secret) {
      throw new Error('Stripe payment has no client secret');
    }
    return intent.client_secret;
  }

  // One Stripe Customer per user. The Stripe-side idempotency key makes a
  // race create a single customer; the row insert keeps the first one.
  private async customerOf(userId: string): Promise<string> {
    const known = await this.customers.findForUser(userId, this.provider);
    if (known) {
      return known.providerCustomerId;
    }

    const created = await this.stripe.customers.create(
      { metadata: { userId } },
      { idempotencyKey: `customer:${userId}` },
    );
    const stored = await this.customers.insertOnce(
      new BillingCustomer({
        userId,
        provider: this.provider,
        providerCustomerId: created.id,
      }),
    );

    return stored.providerCustomerId;
  }
}
