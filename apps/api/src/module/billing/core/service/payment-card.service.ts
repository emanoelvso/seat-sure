import { ConfigService } from '@sharedModules/config/service/config.service';
import { demoCardError } from '@billingModule/core/util/demo-card-rules';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { CardThrottleService } from '@billingModule/core/service/card-throttle.service';
import {
  NewPaymentCard,
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
import { isUUID } from 'class-validator';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { DataSource, EntityManager } from 'typeorm';

export const MAX_PAYMENT_CARDS = 5;

const cardNotFound = () =>
  new BillingException('CARD_NOT_FOUND', 'This card is no longer available.');

// Saved cards (AD-026). The card number and CVV only live in local variables
// for the gateway call: they never reach a row, a log line, or an error
// message. Neither does the token.
@Injectable()
export class PaymentCardService {
  constructor(
    private readonly config: ConfigService,
    private readonly paymentCardRepository: BillingPaymentCardRepository,
    private readonly cardThrottleService: CardThrottleService,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    @InjectDataSource('billing') private readonly dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  // The caller's cards, default first, then oldest saved first (CARD-01 AC 3)
  async list(userId: string, now: Date): Promise<PaymentCardModel[]> {
    const cards = await this.paymentCardRepository.listForUser(userId);

    return cards.map((card) => toPaymentCardModel(card, now));
  }

  // Throttled (AD-028): a locked user is refused before any rule or gateway
  // call. An invalid or declined card counts as a failure; a saved one clears
  // the count. A duplicate, the card limit, or an unexpected error do not
  // count.
  async add(
    userId: string,
    card: CardInput,
    now: Date,
  ): Promise<PaymentCardModel[]> {
    await this.cardThrottleService.assertNotLocked(userId, now);

    try {
      await this.saveCard(userId, card, now);
    } catch (error) {
      if (
        error instanceof BillingException &&
        (error.reason === 'INVALID_CARD' || error.reason === 'CARD_DECLINED')
      ) {
        await this.cardThrottleService.recordFailure(userId, now);
      }
      throw error;
    }

    await this.cardThrottleService.clear(userId);

    return this.list(userId, now);
  }

  // Rules, then tokenize, then a locked insert (CARD-03, CARD-04, CARD-05)
  private async saveCard(
    userId: string,
    card: CardInput,
    now: Date,
  ): Promise<void> {
    // Only the invalid fields, so the client marks exactly those (CARD-04 AC 8)
    const errors = validateCard(card, now);
    const demoError = demoCardError(
      card.number,
      this.config.get('demo.enabled'),
    );
    if (demoError) errors.number = demoError;
    const fields = Object.fromEntries(
      Object.entries(errors).filter(([, message]) => message !== ''),
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
      await this.inUserLock(userId, (manager) =>
        this.insertCard(manager, userId, {
          provider: this.gateway.provider,
          providerToken: tokenized.token,
          fingerprint: tokenized.fingerprint,
          brand: detectBrand(card.number),
          last4: last4(card.number),
          expMonth: expiry.month,
          expYear: expiry.year,
          holder: card.holder.trim(),
        }),
      );
    } catch (error) {
      // Nothing was stored, so the gateway must not keep the token either
      await this.gateway.detach(tokenized.token);
      throw error;
    }
  }

  // The card limit, the duplicate check, then the insert. Runs inside the
  // user's lock, so the limit and the single default hold under concurrent
  // requests.
  async insertCard(
    manager: EntityManager,
    userId: string,
    card: NewPaymentCard,
  ): Promise<void> {
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
        card.fingerprint,
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
        provider: card.provider,
        providerToken: card.providerToken,
        customerId: card.customerId ?? null,
        fingerprint: card.fingerprint,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        holder: card.holder,
        isDefault: count === 0,
      }),
    );
  }

  // Makes the card the caller's only default; the current default is left
  // as it is (CARD-10 AC 4). An unknown, foreign, or malformed id changes
  // nothing (CARD-11 AC 10).
  async setDefault(
    userId: string,
    cardId: string,
    now: Date,
  ): Promise<PaymentCardModel[]> {
    if (!isUUID(cardId)) {
      throw cardNotFound();
    }

    await this.inUserLock(userId, async (manager) => {
      const card = await this.paymentCardRepository.findForUser(
        manager,
        userId,
        cardId,
      );
      if (!card) {
        throw cardNotFound();
      }

      if (!card.isDefault) {
        await this.paymentCardRepository.moveDefault(manager, userId, cardId);
      }
    });

    return this.list(userId, now);
  }

  // Hard-deletes the card, so its token row is really gone and the same card
  // can be saved again (CARD-10 AC 7). Removing the default promotes the
  // oldest remaining card (AC 8). An unknown, foreign, or malformed id changes
  // nothing (CARD-11 AC 10).
  async remove(
    userId: string,
    cardId: string,
    now: Date,
  ): Promise<PaymentCardModel[]> {
    if (!isUUID(cardId)) {
      throw cardNotFound();
    }

    const removed = await this.inUserLock(userId, async (manager) => {
      const card = await this.paymentCardRepository.findForUser(
        manager,
        userId,
        cardId,
      );
      if (!card) {
        throw cardNotFound();
      }

      await this.paymentCardRepository.hardDelete(manager, cardId);

      if (card.isDefault) {
        const [oldest] = await this.paymentCardRepository.listForUser(
          userId,
          manager,
        );
        if (oldest) {
          await this.paymentCardRepository.moveDefault(
            manager,
            userId,
            oldest.id,
          );
        }
      }

      return card;
    });

    // After the commit: the row is gone whatever the gateway says. The log
    // names the card id only, never the token (CARD-06 AC 17).
    try {
      await this.gateway.detach(removed.providerToken);
    } catch {
      this.logger.error("Couldn't detach a removed payment card", {
        cardId,
      });
    }

    return this.list(userId, now);
  }

  // The caller's card, for a charge; null for an unknown, foreign, or
  // malformed id (CARD-08 AC 9)
  async findOwned(
    userId: string,
    cardId: string,
  ): Promise<BillingPaymentCard | null> {
    if (!isUUID(cardId)) {
      return null;
    }

    return this.paymentCardRepository.findForUser(
      this.dataSource.manager,
      userId,
      cardId,
    );
  }

  // Serializes one user's add / set default / remove, so the card limit and
  // the single default hold under concurrent requests
  async inUserLock<T>(
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
