import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingAccountErasureService } from '@billingModule/core/service/account-erasure.service';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('BillingAccountErasureService (integration)', () => {
  let module: TestingModule;
  let service: BillingAccountErasureService;
  let detach: jest.SpyInstance;
  let deleteCustomer: jest.SpyInstance;
  let logged: unknown[][];

  const userId = randomUUID();
  const otherUserId = randomUUID();

  const seedUser = async (id: string) => {
    const cards = billingPaymentCardFactory
      .buildList(2, { userId: id })
      .map((card, index) => ({ ...card, isDefault: index === 0 }));
    const pending = {
      id: randomUUID(),
      paymentId: randomUUID(),
      userId: id,
      provider: 'simulated',
      providerToken: `sim_pm_${randomUUID()}`,
      fingerprint: 'f'.repeat(64),
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2030,
      holder: 'Ada Lovelace',
    };
    const customer = {
      id: randomUUID(),
      userId: id,
      provider: 'stripe',
      providerCustomerId: `cus_${randomUUID()}`,
    };
    await testDbClient(Tables.BillingPaymentCard).insert(cards);
    await testDbClient(Tables.BillingPendingCard).insert(pending);
    await testDbClient(Tables.BillingCustomer).insert(customer);
    await testDbClient(Tables.BillingCardThrottle).insert({
      id: randomUUID(),
      userId: id,
      failedCount: 2,
      windowStartedAt: new Date(),
    });
    return { cards, pending, customer };
  };

  const rowsOf = (table: Tables, id: string) =>
    testDbClient(table).where({ userId: id });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
    service = module.get(BillingAccountErasureService);
  });

  beforeEach(async () => {
    for (const table of [
      Tables.BillingPaymentCard,
      Tables.BillingPendingCard,
      Tables.BillingCustomer,
      Tables.BillingCardThrottle,
    ]) {
      await testDbClient(table).del();
    }
    const gateway = module.get<PaymentGateway>(PaymentGateway);
    detach = jest.spyOn(gateway, 'detach');
    deleteCustomer = jest.spyOn(gateway, 'deleteCustomer');
    logged = [];
    for (const method of ['log', 'error', 'warn'] as const) {
      jest
        .spyOn(AppLogger.prototype, method)
        .mockImplementation((...args: unknown[]) => {
          logged.push(args);
        });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    for (const table of [
      Tables.BillingPaymentCard,
      Tables.BillingPendingCard,
      Tables.BillingCustomer,
      Tables.BillingCardThrottle,
    ]) {
      await testDbClient(table).del();
    }
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("deletes the user's cards, pending cards, card throttle and customer rows, and no other user's (ERASE-01 AC 1)", async () => {
    await seedUser(userId);
    await seedUser(otherUserId);

    await service.erase(userId);

    for (const table of [
      Tables.BillingPaymentCard,
      Tables.BillingPendingCard,
      Tables.BillingCustomer,
      Tables.BillingCardThrottle,
    ]) {
      expect(await rowsOf(table, userId)).toEqual([]);
    }
    expect(await rowsOf(Tables.BillingPaymentCard, otherUserId)).toHaveLength(
      2,
    );
    expect(await rowsOf(Tables.BillingPendingCard, otherUserId)).toHaveLength(
      1,
    );
    expect(await rowsOf(Tables.BillingCustomer, otherUserId)).toHaveLength(1);
    expect(await rowsOf(Tables.BillingCardThrottle, otherUserId)).toHaveLength(
      1,
    );
  });

  it('detaches exactly the three seeded tokens once each (ERASE-02 AC 2)', async () => {
    const { cards, pending } = await seedUser(userId);
    await seedUser(otherUserId);

    await service.erase(userId);

    expect(detach).toHaveBeenCalledTimes(3);
    expect(detach.mock.calls.map(([token]) => token).sort()).toEqual(
      [
        ...cards.map((card) => card.providerToken),
        pending.providerToken,
      ].sort(),
    );
  });

  it('detaches the token of a card from another provider too (ERASE-02 AC 2)', async () => {
    const stripeCard = billingPaymentCardFactory.build({
      userId,
      provider: 'stripe',
      providerToken: 'pm_stripe_1',
      isDefault: true,
    });
    await testDbClient(Tables.BillingPaymentCard).insert(stripeCard);

    await service.erase(userId);

    expect(detach).toHaveBeenCalledWith('pm_stripe_1');
    expect(await rowsOf(Tables.BillingPaymentCard, userId)).toEqual([]);
  });

  it('deletes the Stripe customer at the gateway with its customer id (ERASE-03 AC 3)', async () => {
    const { customer } = await seedUser(userId);

    await service.erase(userId);

    expect(deleteCustomer).toHaveBeenCalledTimes(1);
    expect(deleteCustomer).toHaveBeenCalledWith(customer.providerCustomerId);
  });

  it('still deletes every row and logs the user id and step, never a token, fingerprint or provider id, when a detach throws (ERASE-02 AC 4)', async () => {
    const { cards, pending, customer } = await seedUser(userId);
    detach.mockRejectedValue(
      new Error(`gateway refused ${pending.providerToken}`),
    );

    await expect(service.erase(userId)).resolves.toBeUndefined();

    expect(await rowsOf(Tables.BillingPaymentCard, userId)).toEqual([]);
    expect(await rowsOf(Tables.BillingPendingCard, userId)).toEqual([]);
    expect(logged).toHaveLength(3);
    expect(logged.map(([, context]) => context)).toEqual([
      { userId, step: 'detach' },
      { userId, step: 'detach' },
      { userId, step: 'detach' },
    ]);
    const output = JSON.stringify(logged);
    for (const secret of [
      ...cards.map((card) => card.providerToken),
      ...cards.map((card) => card.fingerprint),
      pending.providerToken,
      pending.fingerprint,
      customer.providerCustomerId,
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it('succeeds without calling the gateway when the user has no billing data (ERASE-01 AC 5)', async () => {
    await expect(service.erase(randomUUID())).resolves.toBeUndefined();

    expect(detach).not.toHaveBeenCalled();
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it('succeeds again on a second call and changes nothing (ERASE-01 AC 6)', async () => {
    await seedUser(userId);
    await service.erase(userId);
    detach.mockClear();
    deleteCustomer.mockClear();

    await expect(service.erase(userId)).resolves.toBeUndefined();

    expect(detach).not.toHaveBeenCalled();
    expect(deleteCustomer).not.toHaveBeenCalled();
  });

  it('keeps the customer row, deletes the card rows, logs the user id and step, and rejects when the customer delete throws (ERASE-03 AC 8)', async () => {
    const { customer } = await seedUser(userId);
    deleteCustomer.mockRejectedValue(new Error('stripe down'));

    await expect(service.erase(userId)).rejects.toThrow();

    expect(await rowsOf(Tables.BillingPaymentCard, userId)).toEqual([]);
    expect(await rowsOf(Tables.BillingPendingCard, userId)).toEqual([]);
    expect(await rowsOf(Tables.BillingCustomer, userId)).toEqual([
      expect.objectContaining({
        providerCustomerId: customer.providerCustomerId,
      }),
    ]);
    expect(logged).toHaveLength(1);
    expect(logged[0][1]).toEqual({ userId, step: 'customer-delete' });
    expect(JSON.stringify(logged)).not.toContain(customer.providerCustomerId);
  });

  it('deletes the customer row on the retry once the gateway recovers (ERASE-03 AC 8, PEND-03)', async () => {
    const { customer } = await seedUser(userId);
    deleteCustomer.mockRejectedValueOnce(new Error('stripe down'));
    await expect(service.erase(userId)).rejects.toThrow();

    await expect(service.erase(userId)).resolves.toBeUndefined();

    expect(deleteCustomer).toHaveBeenLastCalledWith(
      customer.providerCustomerId,
    );
    expect(await rowsOf(Tables.BillingCustomer, userId)).toEqual([]);
  });
});
