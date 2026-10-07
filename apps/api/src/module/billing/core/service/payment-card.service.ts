import { Injectable } from '@nestjs/common';
import {
  PaymentCardModel,
  toPaymentCardModel,
} from '@billingModule/core/model/payment-card.model';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';

@Injectable()
export class PaymentCardService {
  constructor(
    private readonly paymentCardRepository: BillingPaymentCardRepository,
  ) {}

  // The caller's cards, default first, then oldest saved first (CARD-01 AC 3)
  async list(userId: string, now: Date): Promise<PaymentCardModel[]> {
    const cards = await this.paymentCardRepository.listForUser(userId);

    return cards.map((card) => toPaymentCardModel(card, now));
  }
}
