import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { TokenReconciliationService } from '@billingModule/core/service/token-reconciliation.service';
import { StripePaymentGateway } from '@billingModule/integration/provider/stripe-payment-gateway.provider';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import Stripe from 'stripe';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const TWO_DAYS_AGO = Math.floor(
  (NOW.getTime() - 2 * 24 * 60 * 60 * 1000) / 1000,
);

// The Stripe client is the only fake: the real adapter and the real
// reconciliation service run on top of it
const client = {
  customers: { listPaymentMethods: jest.fn() },
  paymentMethods: { detach: jest.fn(), retrieve: jest.fn() },
};

const invalidRequest = () =>
  new Stripe.errors.StripeInvalidRequestError({
    type: 'invalid_request_error',
    message: 'invalid',
  });

describe('TokenReconciliationService on the Stripe adapter (integration, stub client)', () => {
  let module: TestingModule;
  let service: TokenReconciliationService;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({ imports: [BillingModule] })
      .overrideProvider(PaymentGateway)
      .useFactory({
        factory: (
          config: ConfigService,
          customers: BillingCustomerRepository,
        ) =>
          new StripePaymentGateway(
            client as unknown as Stripe,
            config,
            customers,
          ),
        inject: [ConfigService, BillingCustomerRepository],
      })
      .compile();
    service = module.get(TokenReconciliationService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingCustomer).del();
    jest.resetAllMocks();
    await testDbClient(Tables.BillingCustomer).insert({
      id: randomUUID(),
      userId: randomUUID(),
      provider: 'stripe',
      providerCustomerId: `cus_${randomUUID()}`,
    });
    client.customers.listPaymentMethods.mockReturnValue(
      (async function* () {
        yield { id: 'pm_orphan', created: TWO_DAYS_AGO };
      })(),
    );
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingCustomer).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('counts an orphan that Stripe says is no longer attached as detached, not as a failure (REC AC 5)', async () => {
    client.paymentMethods.detach.mockRejectedValue(invalidRequest());
    client.paymentMethods.retrieve.mockResolvedValue({
      id: 'pm_orphan',
      customer: null,
    });

    const summary = await service.reconcile(NOW);

    expect(summary).toEqual(
      expect.objectContaining({ orphansDetached: 1, failures: 0 }),
    );
  });

  it('counts a failure when Stripe still has the orphan attached after the detach error (REC AC 5)', async () => {
    client.paymentMethods.detach.mockRejectedValue(invalidRequest());
    client.paymentMethods.retrieve.mockResolvedValue({
      id: 'pm_orphan',
      customer: 'cus_still',
    });

    const summary = await service.reconcile(NOW);

    expect(summary).toEqual(
      expect.objectContaining({ orphansDetached: 0, failures: 1 }),
    );
  });
});
