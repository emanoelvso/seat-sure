import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  AuthorizeInput,
  AuthorizeResult,
  GatewayPayment,
  PaymentGateway,
  TokenizeResult,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { StripeClient } from '@billingModule/integration/provider/stripe-client.provider';

const isCardError = (error: unknown): boolean =>
  (error as { type?: string } | null)?.type === 'StripeCardError';

// Stripe test-mode adapter (GW-33..GW-40). Every money-moving call carries the
// caller's idempotency key. A card error is a decline; any other error
// (network, auth, rate limit) throws so the order is released (GW-40).
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  readonly provider = 'stripe' as const;
  readonly acceptsTypedCards = false;

  constructor(@Inject(StripeClient) private readonly stripe: Stripe) {}

  // Stripe cards are collected by Elements in the browser as a PaymentMethod
  async tokenize(): Promise<TokenizeResult> {
    throw new Error('Typed cards are not supported by the Stripe gateway');
  }

  async detach(token: string): Promise<void> {
    await this.stripe.paymentMethods.detach(token);
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
}
