import { Inject, Injectable } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
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

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  card: CardInput;
}

export interface ChargeOutcome {
  paymentId: string;
  status: 'succeeded' | 'failed';
}

export interface PaymentCard {
  brand: string;
  last4: string;
}

@Injectable()
export class BillingService {
  constructor(
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    private readonly paymentRepository: BillingPaymentRepository,
  ) {}

  validateCard(card: CardInput, now: Date): CardFieldErrors {
    return validateCard(card, now);
  }

  // Validates the card, charges through the gateway, then records the
  // payment (PAY-37, PAY-40, PAY-44). The card number and CVV are only ever
  // held in local variables - they never reach the inserted row or a log
  // line (PAY-47).
  async charge({
    userId,
    orderId,
    amountCents,
    currency,
    card,
  }: ChargeDto): Promise<ChargeOutcome> {
    const errors = validateCard(card, new Date());
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
      amountCents,
      currency,
      source: { type: 'card', card },
    });

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
      cardBrand: detectBrand(card.number),
      cardLast4: last4(card.number),
      failureReason: result.status === 'failed' ? result.reason : null,
      refundedAt: null,
    });
    await this.paymentRepository.save(payment);

    return { paymentId: payment.id, status: result.status };
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
