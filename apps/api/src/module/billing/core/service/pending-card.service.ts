import { Inject, Injectable } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { NewPaymentCard } from '@billingModule/core/model/payment-card.model';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { BillingPendingCard } from '@billingModule/persistence/entity/billing-pending-card.entity';
import { BillingPendingCardRepository } from '@billingModule/persistence/repository/billing-pending-card.repository';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

// A save the card can't take any more: the payment is unaffected (CARD-09)
const REFUSALS: BillingException['reason'][] = [
  'DUPLICATE_CARD',
  'CARD_LIMIT_REACHED',
];

// A card the buyer asked to save, held until its payment is captured
// (GW-50). Same secrecy rules as a saved card (AD-026).
@Injectable()
export class PendingCardService {
  constructor(
    private readonly pendingCardRepository: BillingPendingCardRepository,
    private readonly paymentCardService: PaymentCardService,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    private readonly logger: AppLogger,
  ) {}

  async hold(
    paymentId: string,
    userId: string,
    card: NewPaymentCard,
  ): Promise<void> {
    await this.pendingCardRepository.save(
      new BillingPendingCard({
        paymentId,
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
      }),
    );
  }

  // Saves the held card as the user's. A duplicate or a full wallet drops it
  // and detaches its token instead. No held card, nothing to do.
  async promote(paymentId: string): Promise<void> {
    const pending = await this.pendingCardRepository.findByPaymentId(paymentId);
    if (!pending) {
      return;
    }

    try {
      await this.paymentCardService.inUserLock(
        pending.userId,
        async (manager) => {
          await this.paymentCardService.insertCard(
            manager,
            pending.userId,
            pending,
          );
          await this.pendingCardRepository.hardDelete(pending.id, manager);
        },
      );
    } catch (error) {
      if (
        error instanceof BillingException &&
        REFUSALS.includes(error.reason)
      ) {
        await this.drop(pending);
        return;
      }
      throw error;
    }
  }

  async discard(paymentId: string): Promise<void> {
    const pending = await this.pendingCardRepository.findByPaymentId(paymentId);
    if (pending) {
      await this.drop(pending);
    }
  }

  // Best effort at the gateway: the row is gone whatever it says, and the
  // reconciliation command detaches what is left. The log names the payment
  // only, never the token (CLN-02).
  private async drop(pending: BillingPendingCard): Promise<void> {
    await this.pendingCardRepository.hardDelete(pending.id);
    try {
      await this.gateway.detach(pending.providerToken);
    } catch {
      this.logger.error("Couldn't detach a dropped pending card", {
        paymentId: pending.paymentId,
      });
    }
  }
}
