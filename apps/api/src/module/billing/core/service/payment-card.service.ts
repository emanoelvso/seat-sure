import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import {
  PaymentCardModel,
  toPaymentCardModel,
} from '@billingModule/core/model/payment-card.model';
import {
  CardInput,
  detectBrand,
  last4,
  parseExpiry,
  validateCard,
} from '@billingModule/core/util/card-rules';
import { BillingPaymentCard } from '@billingModule/persistence/entity/billing-payment-card.entity';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';
import { DataSource, EntityManager } from 'typeorm';

export const MAX_PAYMENT_CARDS = 5;

// Saved cards (AD-026). The card number and CVV only live in local variables
// for the gateway call: they never reach a row, a log line, or an error
// message. Neither does the token.
@Injectable()
export class PaymentCardService {
  constructor(
    private readonly paymentCardRepository: BillingPaymentCardRepository,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    @InjectDataSource('billing') private readonly dataSource: DataSource,
  ) {}

  // The caller's cards, default first, then oldest saved first (CARD-01 AC 3)
  async list(userId: string, now: Date): Promise<PaymentCardModel[]> {
    const cards = await this.paymentCardRepository.listForUser(userId);

    return cards.map((card) => toPaymentCardModel(card, now));
  }

  // Rules, then tokenize, then a locked insert (CARD-03, CARD-04, CARD-05)
  async add(
    userId: string,
    card: CardInput,
    now: Date,
  ): Promise<PaymentCardModel[]> {
    // Only the invalid fields, so the client marks exactly those (CARD-04 AC 8)
    const fields = Object.fromEntries(
      Object.entries(validateCard(card, now)).filter(
        ([, message]) => message !== '',
      ),
    );
    if (Object.keys(fields).length > 0) {
      throw new BillingException(
        'INVALID_CARD',
        'Check your card details.',
        fields,
      );
    }

    const tokenized = await this.gateway.tokenize(card);
    if (tokenized.status === 'failed') {
      throw new BillingException('CARD_DECLINED', 'This card was declined.');
    }

    // The rules above guarantee a parsable expiry
    const expiry = parseExpiry(card.expiry) as { month: number; year: number };

    try {
      await this.inUserLock(userId, async (manager) => {
        const count = await this.paymentCardRepository.countForUser(
          manager,
          userId,
        );
        if (count >= MAX_PAYMENT_CARDS) {
          throw new BillingException(
            'CARD_LIMIT_REACHED',
            `You can save up to ${MAX_PAYMENT_CARDS} cards.`,
          );
        }

        if (
          await this.paymentCardRepository.hasFingerprint(
            manager,
            userId,
            tokenized.fingerprint,
          )
        ) {
          throw new BillingException(
            'DUPLICATE_CARD',
            'This card is already saved.',
            { number: 'This card is already saved.' },
          );
        }

        // Only the first card becomes the default (CARD-03 AC 4, 5)
        await this.paymentCardRepository.insert(
          manager,
          new BillingPaymentCard({
            userId,
            provider: 'simulated',
            providerToken: tokenized.token,
            fingerprint: tokenized.fingerprint,
            brand: detectBrand(card.number),
            last4: last4(card.number),
            expMonth: expiry.month,
            expYear: expiry.year,
            holder: card.holder.trim(),
            isDefault: count === 0,
          }),
        );
      });
    } catch (error) {
      // Nothing was stored, so the gateway must not keep the token either
      await this.gateway.detach(tokenized.token);
      throw error;
    }

    return this.list(userId, now);
  }

  // Serializes one user's add / set default / remove, so the card limit and
  // the single default hold under concurrent requests
  private async inUserLock<T>(
    userId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `payment-cards:${userId}`,
      ]);
      return work(manager);
    });
  }
}
