import { ConfigService } from '@sharedModules/config/service/config.service';
import { demoCardError } from '@billingModule/core/util/demo-card-rules';
import { Inject, Injectable } from '@nestjs/common';
import {
  AuthorizeInput,
  AuthorizeResult,
  GatewayProvider,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { isCardExpired } from '@billingModule/core/model/payment-card.model';
import { CardThrottleService } from '@billingModule/core/service/card-throttle.service';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { PendingCardService } from '@billingModule/core/service/pending-card.service';
import {
  CardFieldErrors,
  CardInput,
  detectBrand,
  last4,
  parseExpiry,
  validateCard,
} from '@billingModule/core/util/card-rules';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { PaymentStatus } from '@billingModule/core/enum/payment-status.enum';
import { BillingPayment } from '@billingModule/persistence/entity/billing-payment.entity';
import { BillingPaymentRepository } from '@billingModule/persistence/repository/billing-payment.repository';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { isUUID } from 'class-validator';
import { randomUUID } from 'crypto';

export type ChargeSource =
  | { type: 'card'; card: CardInput }
  | { type: 'savedCard'; savedCardId: string };

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  source: ChargeSource;
  saveCard?: boolean;
}

export interface PaymentAction {
  provider: GatewayProvider;
  clientSecret: string;
}

export type ChargeOutcome =
  | { status: 'authorized' | 'failed'; paymentId: string }
  | { status: 'requires_action'; paymentId: string; action: PaymentAction }
  | { status: 'card_not_found' }
  | { status: 'card_attempts_limited' };

export type SettleOutcome =
  | { status: 'authorized' | 'failed' }
  | { status: 'requires_action'; action: PaymentAction };

const MAX_CAPTURE_ATTEMPTS = 3;

type ChargeResult =
  AuthorizeResult | { status: 'failed'; reason: 'card_expired' };

type PaymentDetails = Pick<
  ChargeDto,
  'userId' | 'orderId' | 'amountCents' | 'currency'
>;

export interface PaymentCard {
  brand: string;
  last4: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly config: ConfigService,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    private readonly paymentRepository: BillingPaymentRepository,
    private readonly paymentCardService: PaymentCardService,
    private readonly pendingCardService: PendingCardService,
    private readonly cardThrottleService: CardThrottleService,
    private readonly logger: AppLogger,
  ) {}

  validateCard(card: CardInput, now: Date): CardFieldErrors {
    const errors = validateCard(card, now);
    const demoError = demoCardError(
      card.number,
      this.config.get('demo.enabled'),
    );
    if (demoError) errors.number = demoError;
    return errors;
  }

  // Authorizes a typed card or a saved card and records the payment (PAY-37,
  // PAY-40, PAY-44, CARD-08). The money is only held: capturing it is the
  // caller's next step. The card number and CVV are only ever held in local
  // variables - they never reach the inserted row or a log line (PAY-47).
  // Neither does a token or a client secret (GW-07).
  async charge({
    source,
    saveCard = false,
    ...payment
  }: ChargeDto): Promise<ChargeOutcome> {
    const paymentId = randomUUID();

    if (source.type === 'card') {
      return this.chargeTypedCard(paymentId, payment, source.card, saveCard);
    }

    // A foreign or missing card is charged nothing and leaves no row
    // (CARD-08 AC 9)
    const savedCard = await this.paymentCardService.findOwned(
      payment.userId,
      source.savedCardId,
    );
    if (!savedCard) {
      return { status: 'card_not_found' };
    }

    // Slows card testing (AD-028): a locked user is charged nothing and no
    // payment is recorded
    const now = new Date();
    if (await this.cardThrottleService.isLocked(payment.userId, now)) {
      return { status: 'card_attempts_limited' };
    }

    // An expired card would be refused by a real gateway: record the same
    // outcome without calling it
    const result: ChargeResult = isCardExpired(savedCard, now)
      ? { status: 'failed', reason: 'card_expired' }
      : await this.authorize(paymentId, {
          amountCents: payment.amountCents,
          currency: payment.currency,
          source: {
            type: 'token',
            token: savedCard.providerToken,
            customerId: savedCard.customerId ?? undefined,
          },
        });

    // The saved card's brand and last 4 (CARD-08 AC 11)
    return this.finish(
      paymentId,
      payment,
      { brand: savedCard.brand, last4: savedCard.last4 },
      result,
      now,
    );
  }

  private async chargeTypedCard(
    paymentId: string,
    payment: PaymentDetails,
    card: CardInput,
    saveCard: boolean,
  ): Promise<ChargeOutcome> {
    // Slows card testing (AD-028): a locked user is charged nothing and no
    // payment is recorded, before any rule or gateway call
    const now = new Date();
    if (await this.cardThrottleService.isLocked(payment.userId, now)) {
      return { status: 'card_attempts_limited' };
    }

    const errors = this.validateCard(card, now);
    const invalidField = Object.entries(errors).find(
      ([, message]) => message !== '',
    );

    if (invalidField) {
      throw new BillingException(
        'INVALID_CARD',
        errors[invalidField[0] as keyof CardFieldErrors],
        errors,
      );
    }

    const display = {
      brand: detectBrand(card.number),
      last4: last4(card.number),
    };
    let source: AuthorizeInput['source'] = { type: 'card', card };

    // A card to save is tokenized before the charge and held until the
    // payment is captured (GW-50). A decline here is a failed payment.
    if (saveCard) {
      const tokenized = await this.gateway.tokenize(card);
      if (tokenized.status === 'failed') {
        return this.finish(paymentId, payment, display, tokenized, now);
      }

      // The rules above guarantee a parsable expiry
      const expiry = parseExpiry(card.expiry) as {
        month: number;
        year: number;
      };
      await this.pendingCardService.hold(paymentId, payment.userId, {
        provider: this.gateway.provider,
        providerToken: tokenized.token,
        fingerprint: tokenized.fingerprint,
        brand: display.brand,
        last4: display.last4,
        expMonth: expiry.month,
        expYear: expiry.year,
        holder: card.holder.trim(),
      });
      source = { type: 'token', token: tokenized.token };
    }

    let result: ChargeResult;
    try {
      result = await this.authorize(paymentId, {
        amountCents: payment.amountCents,
        currency: payment.currency,
        source,
      });
    } catch (error) {
      if (saveCard) await this.pendingCardService.discard(paymentId);
      throw error;
    }

    const outcome = await this.finish(paymentId, payment, display, result, now);
    if (saveCard && result.status === 'failed') {
      await this.pendingCardService.discard(paymentId);
    }

    return outcome;
  }

  // One retry with the same idempotency key when the gateway throws, so a
  // lost response never charges twice (GW-02, GW-49)
  private async authorize(
    paymentId: string,
    input: AuthorizeInput,
  ): Promise<AuthorizeResult> {
    const key = `${paymentId}:authorize`;
    try {
      return await this.gateway.authorize(input, key);
    } catch {
      return this.gateway.authorize(input, key);
    }
  }

  // Records the payment, then moves the throttle: a failure counts, an
  // authorization clears it, a pending challenge leaves it as it is (GW-17)
  private async finish(
    paymentId: string,
    payment: PaymentDetails,
    card: PaymentCard,
    result: ChargeResult,
    now: Date,
  ): Promise<ChargeOutcome> {
    const outcome = await this.record(paymentId, payment, card, result);

    if (result.status === 'failed') {
      await this.cardThrottleService.recordFailure(payment.userId, now);
    } else if (result.status === 'authorized') {
      await this.cardThrottleService.clear(payment.userId);
    }

    return outcome;
  }

  private async record(
    id: string,
    { userId, orderId, amountCents, currency }: PaymentDetails,
    card: PaymentCard,
    result: ChargeResult,
  ): Promise<ChargeOutcome> {
    const statuses = {
      authorized: PaymentStatus.AUTHORIZED,
      requires_action: PaymentStatus.REQUIRES_ACTION,
      failed: PaymentStatus.FAILED,
    };
    await this.paymentRepository.save(
      new BillingPayment({
        id,
        userId,
        orderId,
        provider: this.gateway.provider,
        providerPaymentId:
          result.status === 'failed' ? null : result.providerPaymentId,
        amountCents,
        currency,
        status: statuses[result.status],
        cardBrand: card.brand,
        cardLast4: card.last4,
        failureReason: result.status === 'failed' ? result.reason : null,
        refundedAt: null,
      }),
    );

    if (result.status === 'requires_action') {
      return {
        status: 'requires_action',
        paymentId: id,
        action: {
          provider: this.gateway.provider,
          clientSecret: result.clientSecret,
        },
      };
    }

    return { status: result.status, paymentId: id };
  }

  // Captures the held money, then saves the card held for the payment. The
  // gateway is asked up to 3 times with the same key, so a lost response never
  // captures twice; after 3 failures the error propagates and the payment
  // stays authorized (GW-06). A card that can't be saved never fails a
  // captured payment (CARD-09).
  async capture(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOneById(paymentId);

    if (
      !payment?.providerPaymentId ||
      payment.status !== PaymentStatus.AUTHORIZED
    ) {
      return;
    }

    for (let attempt = 1; ; attempt++) {
      try {
        await this.gateway.capture(
          payment.providerPaymentId,
          `${payment.id}:capture`,
        );
        break;
      } catch (error) {
        if (attempt >= MAX_CAPTURE_ATTEMPTS) {
          throw error;
        }
      }
    }
    payment.status = PaymentStatus.SUCCEEDED;
    await this.paymentRepository.save(payment);

    try {
      await this.pendingCardService.promote(payment.id);
    } catch {
      this.logger.error("Couldn't save the card of a captured payment", {
        orderId: payment.orderId,
        paymentId: payment.id,
      });
    }
  }

  // Releases the held money (an expired order, a lost seat) and drops the card
  // held for the payment. Never a refund: nothing was captured (GW-05, GW-12).
  async cancel(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOneById(paymentId);

    if (
      !payment?.providerPaymentId ||
      ![PaymentStatus.AUTHORIZED, PaymentStatus.REQUIRES_ACTION].includes(
        payment.status,
      )
    ) {
      return;
    }

    await this.gateway.cancel(
      payment.providerPaymentId,
      `${payment.id}:cancel`,
    );
    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepository.save(payment);
    await this.pendingCardService.discard(payment.id);
  }

  // Reads where a challenged payment stands at the gateway and records it
  // (GW-10, GW-11, GW-17). A failed challenge counts as a card failure and
  // drops the card held for the payment.
  async settle(paymentId: string): Promise<SettleOutcome> {
    const payment = await this.paymentRepository.findOneById(paymentId);

    if (!payment?.providerPaymentId) {
      throw new Error('Unknown payment');
    }
    if (payment.status === PaymentStatus.AUTHORIZED) {
      return { status: 'authorized' };
    }
    if (payment.status !== PaymentStatus.REQUIRES_ACTION) {
      return { status: 'failed' };
    }

    const current = await this.gateway.getPayment(payment.providerPaymentId);

    switch (current.status) {
      case 'requires_action':
        return {
          status: 'requires_action',
          action: {
            provider: this.gateway.provider,
            clientSecret: current.clientSecret,
          },
        };
      case 'authentication_failed':
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'authentication_failed';
        await this.paymentRepository.save(payment);
        await this.cardThrottleService.recordFailure(
          payment.userId,
          new Date(),
        );
        await this.pendingCardService.discard(payment.id);
        return { status: 'failed' };
      case 'cancelled':
        payment.status = PaymentStatus.CANCELLED;
        await this.paymentRepository.save(payment);
        await this.pendingCardService.discard(payment.id);
        return { status: 'failed' };
      default:
        // authorized, or already captured behind our back
        payment.status = PaymentStatus.AUTHORIZED;
        await this.paymentRepository.save(payment);
        await this.cardThrottleService.clear(payment.userId);
        return { status: 'authorized' };
    }
  }

  // What the buyer's browser needs to finish a challenge: only while the
  // payment still awaits one, otherwise null (GW-30, GW-32)
  async findPaymentAction(paymentId: string): Promise<PaymentAction | null> {
    if (!isUUID(paymentId)) {
      return null;
    }

    const payment = await this.paymentRepository.findOneById(paymentId);
    if (
      !payment?.providerPaymentId ||
      payment.status !== PaymentStatus.REQUIRES_ACTION
    ) {
      return null;
    }

    const current = await this.gateway.getPayment(payment.providerPaymentId);

    return current.status === 'requires_action'
      ? {
          provider: this.gateway.provider,
          clientSecret: current.clientSecret,
        }
      : null;
  }

  async refund(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOneById(paymentId);

    if (!payment) {
      return;
    }

    if (payment.providerPaymentId) {
      await this.gateway.refund(
        payment.providerPaymentId,
        `${payment.id}:refund`,
      );
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    await this.paymentRepository.save(payment);
  }

  // The card brand and last 4 of a payment, or null for an unknown or a
  // malformed id (ORDDETAIL-02)
  async findPaymentCard(paymentId: string): Promise<PaymentCard | null> {
    if (!isUUID(paymentId)) {
      return null;
    }

    const payment = await this.paymentRepository.findOneById(paymentId);

    return payment
      ? { brand: payment.cardBrand, last4: payment.cardLast4 }
      : null;
  }
}
