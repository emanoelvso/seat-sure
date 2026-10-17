import { ConfigService } from '@sharedModules/config/service/config.service';
import { demoCardError } from '@billingModule/core/util/demo-card-rules';
import { Inject, Injectable } from '@nestjs/common';
import {
  ChargeResult,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { isCardExpired } from '@billingModule/core/model/payment-card.model';
import { CardThrottleService } from '@billingModule/core/service/card-throttle.service';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import {
  CardFieldErrors,
  CardInput,
  detectBrand,
  last4,
  validateCard,
} from '@billingModule/core/util/card-rules';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { PaymentStatus } from '@billingModule/core/enum/payment-status.enum';
import { BillingPayment } from '@billingModule/persistence/entity/billing-payment.entity';
import { BillingPaymentRepository } from '@billingModule/persistence/repository/billing-payment.repository';
import { isUUID } from 'class-validator';

export type ChargeSource =
  | { type: 'card'; card: CardInput }
  | { type: 'savedCard'; savedCardId: string };

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  source: ChargeSource;
}

export type ChargeOutcome =
  | { status: 'succeeded' | 'failed'; paymentId: string }
  | { status: 'card_not_found' }
  | { status: 'card_attempts_limited' };

export type SaveCardOutcome = 'saved' | 'duplicate' | 'limit' | 'declined';

const SAVE_CARD_REFUSALS: Partial<
  Record<BillingException['reason'], SaveCardOutcome>
> = {
  DUPLICATE_CARD: 'duplicate',
  CARD_LIMIT_REACHED: 'limit',
  CARD_DECLINED: 'declined',
};

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
    private readonly cardThrottleService: CardThrottleService,
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

  // Charges a typed card or a saved card, then records the payment (PAY-37,
  // PAY-40, PAY-44, CARD-08). The card number and CVV are only ever held in
  // local variables - they never reach the inserted row or a log line
  // (PAY-47). Neither does a saved card's token.
  async charge({ source, ...payment }: ChargeDto): Promise<ChargeOutcome> {
    if (source.type === 'card') {
      return this.chargeTypedCard(payment, source.card);
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

    const card = { brand: savedCard.brand, last4: savedCard.last4 };

    // An expired card would be refused by a real gateway: record the same
    // outcome without calling it
    const result: ChargeResult | { status: 'failed'; reason: 'card_expired' } =
      isCardExpired(savedCard, now)
        ? { status: 'failed', reason: 'card_expired' }
        : await this.gateway.charge({
            amountCents: payment.amountCents,
            currency: payment.currency,
            source: { type: 'token', token: savedCard.providerToken },
          });

    // The saved card's brand and last 4 (CARD-08 AC 11)
    const outcome = await this.record(payment, card, result);

    if (result.status === 'failed') {
      await this.cardThrottleService.recordFailure(payment.userId, now);
    } else {
      await this.cardThrottleService.clear(payment.userId);
    }

    return outcome;
  }

  private async chargeTypedCard(
    payment: PaymentDetails,
    card: CardInput,
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

    const result = await this.gateway.charge({
      amountCents: payment.amountCents,
      currency: payment.currency,
      source: { type: 'card', card },
    });

    const outcome = await this.record(
      payment,
      { brand: detectBrand(card.number), last4: last4(card.number) },
      result,
    );

    if (result.status === 'failed') {
      await this.cardThrottleService.recordFailure(payment.userId, now);
    } else {
      await this.cardThrottleService.clear(payment.userId);
    }

    return outcome;
  }

  private async record(
    { userId, orderId, amountCents, currency }: PaymentDetails,
    card: PaymentCard,
    result: ChargeResult | { status: 'failed'; reason: 'card_expired' },
  ): Promise<ChargeOutcome> {
    const payment = new BillingPayment({
      userId,
      orderId,
      provider: 'simulated',
      providerPaymentId:
        result.status === 'succeeded' ? result.providerPaymentId : null,
      amountCents,
      currency,
      status:
        result.status === 'succeeded'
          ? PaymentStatus.SUCCEEDED
          : PaymentStatus.FAILED,
      cardBrand: card.brand,
      cardLast4: card.last4,
      failureReason: result.status === 'failed' ? result.reason : null,
      refundedAt: null,
    });
    await this.paymentRepository.save(payment);

    return { paymentId: payment.id, status: result.status };
  }

  // Saves a card the user paid with (CARD-09). The expected refusals come
  // back as an outcome; anything else is thrown.
  async saveCard(
    userId: string,
    card: CardInput,
    now: Date,
  ): Promise<SaveCardOutcome> {
    try {
      await this.paymentCardService.add(userId, card, now);
      return 'saved';
    } catch (error) {
      if (error instanceof BillingException) {
        const outcome = SAVE_CARD_REFUSALS[error.reason];
        if (outcome) {
          return outcome;
        }
      }
      throw error;
    }
  }

  async refund(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOneById(paymentId);

    if (!payment) {
      return;
    }

    if (payment.providerPaymentId) {
      await this.gateway.refund(payment.providerPaymentId);
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
