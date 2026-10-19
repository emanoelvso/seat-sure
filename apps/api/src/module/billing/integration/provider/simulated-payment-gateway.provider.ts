import { createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  AuthorizeInput,
  AuthorizeResult,
  GatewayPayment,
  PaymentGateway,
  TokenizeResult,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentStatus } from '@billingModule/core/enum/simulated-payment-status.enum';
import {
  CardInput,
  normalizeNumber,
} from '@billingModule/core/util/card-rules';
import { BillingSimulatedPayment } from '@billingModule/persistence/entity/billing-simulated-payment.entity';
import { BillingSimulatedPaymentRepository } from '@billingModule/persistence/repository/billing-simulated-payment.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';

// Declined by both tokenize and authorize
const DECLINED_NUMBER = '4000000000000002';
// Tokenizes, but every authorization declines, typed or by saved token
// (Stripe's "attach OK, charge fails" test card)
const TOKEN_DECLINED_NUMBER = '4000000000000341';
// Authorizes only after a 3-D Secure challenge, typed or by saved token
const CHALLENGE_NUMBER = '4000002760003184';
const TOKEN_PREFIX = 'sim_pm_';
const DECLINING_TOKEN_PREFIX = 'sim_pm_decline_';
const CHALLENGE_TOKEN_PREFIX = 'sim_pm_3ds_';
const PAYMENT_PREFIX = 'sim_';
const SECRET_PREFIX = 'sim_secret_';

const { REQUIRES_ACTION, AUTHORIZED, CAPTURED, CANCELLED, REFUNDED } =
  SimulatedPaymentStatus;

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  readonly provider = 'simulated' as const;
  readonly acceptsTypedCards = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly payments: BillingSimulatedPaymentRepository,
  ) {}

  // The fingerprint is a keyed HMAC of the digits, so a leaked table can't be
  // brute-forced back to card numbers without the secret (AD-026)
  async tokenize(card: CardInput): Promise<TokenizeResult> {
    const digits = normalizeNumber(card.number);

    if (digits === DECLINED_NUMBER) {
      return { status: 'failed', reason: 'card_declined' };
    }

    const prefix =
      {
        [TOKEN_DECLINED_NUMBER]: DECLINING_TOKEN_PREFIX,
        [CHALLENGE_NUMBER]: CHALLENGE_TOKEN_PREFIX,
      }[digits] ?? TOKEN_PREFIX;
    const fingerprint = createHmac(
      'sha256',
      this.configService.get('billing.fingerprintSecret'),
    )
      .update(digits)
      .digest('hex');

    return {
      status: 'succeeded',
      token: `${prefix}${randomUUID()}`,
      fingerprint,
    };
  }

  async detach(): Promise<void> {
    return;
  }

  // A repeated key returns the first call's result and creates no second
  // provider payment (GW-03). Declines are deterministic and leave no row.
  async authorize(
    { amountCents, currency, source }: AuthorizeInput,
    key: string,
  ): Promise<AuthorizeResult> {
    const known = await this.payments.findByKey(key);
    if (known) {
      return this.resultOf(known);
    }

    const outcome = this.outcomeOf(source);
    if (outcome === 'declined') {
      return { status: 'failed', reason: 'card_declined' };
    }

    const payment = await this.payments.insertOnce(
      new BillingSimulatedPayment({
        idempotencyKey: key,
        status: outcome === 'challenge' ? REQUIRES_ACTION : AUTHORIZED,
        clientSecret:
          outcome === 'challenge' ? `${SECRET_PREFIX}${randomUUID()}` : null,
        amountCents,
        currency,
      }),
    );

    return this.resultOf(payment);
  }

  async getPayment(providerPaymentId: string): Promise<GatewayPayment> {
    const payment = await this.find(providerPaymentId);

    switch (payment.status) {
      case REQUIRES_ACTION:
        return {
          status: 'requires_action',
          clientSecret: payment.clientSecret as string,
        };
      case AUTHORIZED:
        return { status: 'authorized' };
      case SimulatedPaymentStatus.AUTHENTICATION_FAILED:
        return { status: 'authentication_failed' };
      case CANCELLED:
        return { status: 'cancelled' };
      default:
        return { status: 'captured' };
    }
  }

  // Capture, cancel and refund are idempotent by state: repeating one that
  // already happened does nothing, and one that can't apply throws
  async capture(providerPaymentId: string): Promise<void> {
    await this.move(providerPaymentId, [AUTHORIZED], CAPTURED, [CAPTURED]);
  }

  async cancel(providerPaymentId: string): Promise<void> {
    await this.move(
      providerPaymentId,
      [AUTHORIZED, REQUIRES_ACTION],
      CANCELLED,
      [CANCELLED],
    );
  }

  async refund(providerPaymentId: string): Promise<void> {
    const payment = await this.findOrNull(providerPaymentId);
    if (payment) {
      await this.payments.transition(payment.id, [CAPTURED], REFUNDED);
    }
  }

  // The simulated bank's answer to a challenge (GW-20). False when the secret
  // is unknown or its payment no longer awaits a challenge.
  async approve(clientSecret: string): Promise<boolean> {
    return this.answer(clientSecret, AUTHORIZED);
  }

  async fail(clientSecret: string): Promise<boolean> {
    return this.answer(
      clientSecret,
      SimulatedPaymentStatus.AUTHENTICATION_FAILED,
    );
  }

  private async answer(
    clientSecret: string,
    to: SimulatedPaymentStatus,
  ): Promise<boolean> {
    const payment = await this.payments.findByClientSecret(clientSecret);

    return payment
      ? this.payments.transition(payment.id, [REQUIRES_ACTION], to)
      : false;
  }

  private outcomeOf(
    source: AuthorizeInput['source'],
  ): 'declined' | 'challenge' | 'ok' {
    if (source.type === 'card') {
      const digits = normalizeNumber(source.card.number);
      if ([DECLINED_NUMBER, TOKEN_DECLINED_NUMBER].includes(digits)) {
        return 'declined';
      }
      return digits === CHALLENGE_NUMBER ? 'challenge' : 'ok';
    }

    if (source.token.startsWith(DECLINING_TOKEN_PREFIX)) {
      return 'declined';
    }
    return source.token.startsWith(CHALLENGE_TOKEN_PREFIX) ? 'challenge' : 'ok';
  }

  // A payment that started with a challenge keeps its secret, so a repeated
  // key still gets the first answer after the challenge is settled
  private resultOf(payment: BillingSimulatedPayment): AuthorizeResult {
    const providerPaymentId = `${PAYMENT_PREFIX}${payment.id}`;

    return payment.clientSecret
      ? {
          status: 'requires_action',
          providerPaymentId,
          clientSecret: payment.clientSecret,
        }
      : { status: 'authorized', providerPaymentId };
  }

  private async find(
    providerPaymentId: string,
  ): Promise<BillingSimulatedPayment> {
    const payment = await this.findOrNull(providerPaymentId);
    if (!payment) {
      throw new Error('Unknown simulated payment');
    }
    return payment;
  }

  private async findOrNull(
    providerPaymentId: string,
  ): Promise<BillingSimulatedPayment | null> {
    const id = providerPaymentId.replace(PAYMENT_PREFIX, '');

    return isUUID(id) ? this.payments.findOneById(id) : null;
  }

  private async move(
    providerPaymentId: string,
    from: SimulatedPaymentStatus[],
    to: SimulatedPaymentStatus,
    already: SimulatedPaymentStatus[],
  ): Promise<void> {
    const payment = await this.find(providerPaymentId);
    if (already.includes(payment.status)) {
      return;
    }
    if (!(await this.payments.transition(payment.id, from, to))) {
      throw new Error(`Simulated payment is not ${from.join(' or ')}`);
    }
  }
}
