import { Inject, Injectable } from '@nestjs/common';
import {
  CustomerPaymentMethod,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingCustomer } from '@billingModule/persistence/entity/billing-customer.entity';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';
import { BillingPendingCardRepository } from '@billingModule/persistence/repository/billing-pending-card.repository';
import { TokenReconciliationSummary } from '@sharedModules/integration/interface/billing-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

const PAGE_SIZE = 100;
// Covers an add in flight: Stripe attaches the method, then the row is inserted
const GRACE_MS = 24 * 60 * 60 * 1000;

const emptySummary = (): TokenReconciliationSummary => ({
  customersScanned: 0,
  methodsScanned: 0,
  orphansDetached: 0,
  recentSkipped: 0,
  missingCustomers: 0,
  failures: 0,
});

// Detaches the Stripe payment methods no card or pending-card row points to:
// the leftovers of a crash between a commit and a detach. Stateless, so a
// failed detach is retried by the next run. Logs carry counts and the user id
// only, never a token, payment-method id or customer id (AD-026).
@Injectable()
export class TokenReconciliationService {
  constructor(
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    private readonly customerRepository: BillingCustomerRepository,
    private readonly paymentCardRepository: BillingPaymentCardRepository,
    private readonly pendingCardRepository: BillingPendingCardRepository,
    private readonly logger: AppLogger,
  ) {}

  async reconcile(now: Date): Promise<TokenReconciliationSummary> {
    const summary = emptySummary();
    // Simulated tokens are not real objects, so there is nothing to detach
    if (this.gateway.provider !== 'stripe') {
      this.logger.log('Token reconciliation finished', { ...summary });
      return summary;
    }

    let afterId: string | null = null;
    for (;;) {
      const page = await this.customerRepository.listPage(
        this.gateway.provider,
        afterId,
        PAGE_SIZE,
      );
      for (const customer of page) {
        await this.reconcileCustomer(customer, now, summary);
      }
      if (page.length < PAGE_SIZE) {
        break;
      }
      afterId = page[page.length - 1].id;
    }

    this.logger.log('Token reconciliation finished', { ...summary });
    return summary;
  }

  // One customer's failure never stops the scan of the others
  private async reconcileCustomer(
    customer: BillingCustomer,
    now: Date,
    summary: TokenReconciliationSummary,
  ): Promise<void> {
    summary.customersScanned++;

    let methods: CustomerPaymentMethod[];
    try {
      const listed = await this.gateway.listCustomerPaymentMethods(
        customer.providerCustomerId,
      );
      if (listed.status === 'missing') {
        summary.missingCustomers++;
        return;
      }
      methods = listed.methods;
    } catch {
      this.fail(summary, customer.userId, 'list');
      return;
    }

    const known = new Set([
      ...(await this.paymentCardRepository.listTokensForUser(customer.userId)),
      ...(await this.pendingCardRepository.listTokensForUser(customer.userId)),
    ]);

    for (const method of methods) {
      summary.methodsScanned++;
      if (known.has(method.token)) {
        continue;
      }
      if (now.getTime() - method.createdAt.getTime() <= GRACE_MS) {
        summary.recentSkipped++;
        continue;
      }
      // A row may have been inserted since the list: look again just before
      if (await this.isKnown(method.token)) {
        continue;
      }
      try {
        await this.gateway.detach(method.token);
        summary.orphansDetached++;
      } catch {
        this.fail(summary, customer.userId, 'detach');
      }
    }
  }

  private async isKnown(token: string): Promise<boolean> {
    return (
      (await this.paymentCardRepository.tokenExists(token)) ||
      (await this.pendingCardRepository.tokenExists(token))
    );
  }

  private fail(
    summary: TokenReconciliationSummary,
    userId: string,
    step: 'list' | 'detach',
  ): void {
    summary.failures++;
    this.logger.error('Token reconciliation step failed', { userId, step });
  }
}
