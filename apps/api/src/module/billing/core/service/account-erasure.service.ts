import { Inject, Injectable } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';
import { BillingPendingCardRepository } from '@billingModule/persistence/repository/billing-pending-card.repository';
import { CardThrottleRepository } from '@billingModule/persistence/repository/card-throttle.repository';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

// Erases a deleted user's payment data. Idempotent, so a retry after a partial
// failure changes nothing already erased. Logs name the user and the step,
// never a token, fingerprint or gateway id (AD-026).
@Injectable()
export class BillingAccountErasureService {
  constructor(
    private readonly paymentCardService: PaymentCardService,
    private readonly paymentCardRepository: BillingPaymentCardRepository,
    private readonly pendingCardRepository: BillingPendingCardRepository,
    private readonly customerRepository: BillingCustomerRepository,
    private readonly cardThrottleRepository: CardThrottleRepository,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    private readonly logger: AppLogger,
  ) {}

  async erase(userId: string): Promise<void> {
    // Under the user's lock, so it serializes with an add or a remove
    const tokens = await this.paymentCardService.inUserLock(
      userId,
      async (manager) => {
        const collected = [
          ...(await this.paymentCardRepository.listTokensForUser(
            userId,
            manager,
          )),
          ...(await this.pendingCardRepository.listTokensForUser(
            userId,
            manager,
          )),
        ];
        await this.paymentCardRepository.hardDeleteAllForUser(manager, userId);
        await this.pendingCardRepository.hardDeleteAllForUser(manager, userId);
        await this.cardThrottleRepository.clear(userId);
        return collected;
      },
    );

    // After the commit, the rows are gone whatever the gateway says. Deleting
    // the customer below detaches everything anyway.
    for (const token of tokens) {
      try {
        await this.gateway.detach(token);
      } catch {
        this.logger.error("Couldn't detach a token while erasing an account", {
          userId,
          step: 'detach',
        });
      }
    }

    // A customer row stays until its gateway customer is gone, so the
    // reconciliation still sees a surviving customer's payment methods
    let customerFailed = false;
    for (const customer of await this.customerRepository.findAllForUser(
      userId,
    )) {
      try {
        // Only the gateway that owns the customer can delete it. Another
        // provider's customer stays, so the erasure stays pending (ERASE-03 AC 9)
        if (customer.provider !== this.gateway.provider) {
          throw new Error('The active gateway does not own this customer');
        }
        await this.gateway.deleteCustomer(customer.providerCustomerId);
        await this.customerRepository.hardDelete(customer.id);
      } catch {
        customerFailed = true;
        this.logger.error(
          "Couldn't delete a gateway customer while erasing an account",
          { userId, step: 'customer-delete' },
        );
      }
    }

    if (customerFailed) {
      throw new Error('A gateway customer could not be deleted');
    }
  }
}
