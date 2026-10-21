import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import {
  CustomerPaymentMethod,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingPaymentCardRepository } from '@billingModule/persistence/repository/billing-payment-card.repository';
import { TokenReconciliationService } from '@billingModule/core/service/token-reconciliation.service';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-20T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const customerId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Listing = CustomerPaymentMethod[] | 'missing' | Error;

describe('TokenReconciliationService (integration, fake Stripe gateway)', () => {
  let module: TestingModule;
  let service: TokenReconciliationService;
  let logged: unknown[][];

  // The Stripe side: what each customer has attached
  const listings = new Map<string, Listing>();
  const gateway = {
    provider: 'stripe' as 'stripe' | 'simulated',
    listCustomerPaymentMethods: jest.fn(),
    detach: jest.fn(),
  };

  const method = (age: number): CustomerPaymentMethod => ({
    token: `pm_${randomUUID()}`,
    createdAt: ago(age),
  });

  const seedCustomer = async (
    n: number,
    listing: Listing = [],
    provider = 'stripe',
  ) => {
    const userId = randomUUID();
    const providerCustomerId = `cus_${randomUUID()}`;
    await testDbClient(Tables.BillingCustomer).insert({
      id: customerId(n),
      userId,
      provider,
      providerCustomerId,
    });
    listings.set(providerCustomerId, listing);
    return { userId, providerCustomerId };
  };

  const seedCardRow = (userId: string, token: string) =>
    testDbClient(Tables.BillingPaymentCard).insert(
      billingPaymentCardFactory.build({
        userId,
        providerToken: token,
        isDefault: true,
      }),
    );

  const seedPendingRow = (userId: string, token: string) =>
    testDbClient(Tables.BillingPendingCard).insert({
      id: randomUUID(),
      paymentId: randomUUID(),
      userId,
      provider: 'stripe',
      providerToken: token,
      fingerprint: 'e'.repeat(64),
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2030,
      holder: 'Ada Lovelace',
    });

  const detachedTokens = () =>
    gateway.detach.mock.calls.map(([token]) => token as string);

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({ imports: [BillingModule] })
      .overrideProvider(PaymentGateway)
      .useValue(gateway)
      .compile();
    service = module.get(TokenReconciliationService);
  });

  beforeEach(async () => {
    for (const table of [
      Tables.BillingPaymentCard,
      Tables.BillingPendingCard,
      Tables.BillingCustomer,
    ]) {
      await testDbClient(table).del();
    }
    listings.clear();
    gateway.provider = 'stripe';
    gateway.listCustomerPaymentMethods.mockReset();
    gateway.listCustomerPaymentMethods.mockImplementation(
      async (id: string) => {
        const listing = listings.get(id);
        if (listing instanceof Error) {
          throw listing;
        }
        return listing === 'missing'
          ? { status: 'missing' }
          : { status: 'found', methods: [...(listing ?? [])] };
      },
    );
    // Detaching removes the method at Stripe, so a second run finds nothing
    gateway.detach.mockReset();
    gateway.detach.mockImplementation(async (token: string) => {
      for (const [id, listing] of listings) {
        if (Array.isArray(listing)) {
          listings.set(
            id,
            listing.filter((found) => found.token !== token),
          );
        }
      }
    });
    logged = [];
    for (const level of ['log', 'error', 'warn'] as const) {
      jest
        .spyOn(AppLogger.prototype, level)
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
    ]) {
      await testDbClient(table).del();
    }
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('lists every stripe customer, past one page of 100, and ignores other providers (REC-01 AC 1)', async () => {
    for (let n = 1; n <= 101; n++) {
      await seedCustomer(n);
    }
    await seedCustomer(500, [], 'simulated');

    const summary = await service.reconcile(NOW);

    expect(summary.customersScanned).toBe(101);
    expect(gateway.listCustomerPaymentMethods).toHaveBeenCalledTimes(101);
    const listed = new Set(
      gateway.listCustomerPaymentMethods.mock.calls.flat(),
    );
    expect(listed.size).toBe(101);
  });

  it('detaches a method with no row that is older than 24 hours (REC-02 AC 2)', async () => {
    const orphan = method(2 * 24 * HOUR);
    await seedCustomer(1, [orphan]);

    const summary = await service.reconcile(NOW);

    expect(detachedTokens()).toEqual([orphan.token]);
    expect(summary.orphansDetached).toBe(1);
  });

  it('detaches a method 24 hours and 1 ms old (REC-02 AC 4 boundary)', async () => {
    const justOver = method(24 * HOUR + 1);
    await seedCustomer(1, [justOver]);

    await service.reconcile(NOW);

    expect(detachedTokens()).toEqual([justOver.token]);
  });

  it('keeps a method that has a saved-card row or a pending-card row (REC-02 AC 3)', async () => {
    const saved = method(3 * 24 * HOUR);
    const held = method(3 * 24 * HOUR);
    const { userId } = await seedCustomer(1, [saved, held]);
    await seedCardRow(userId, saved.token);
    await seedPendingRow(userId, held.token);

    const summary = await service.reconcile(NOW);

    expect(gateway.detach).not.toHaveBeenCalled();
    expect(summary.orphansDetached).toBe(0);
    expect(summary.methodsScanned).toBe(2);
  });

  it('keeps a method exactly 24 hours old and one 1 hour old, counting both as recent (REC-02 AC 4)', async () => {
    await seedCustomer(1, [method(24 * HOUR), method(HOUR)]);

    const summary = await service.reconcile(NOW);

    expect(gateway.detach).not.toHaveBeenCalled();
    expect(summary.recentSkipped).toBe(2);
  });

  it('does not detach a method whose row is inserted after the known tokens were read and before the detach (REC-02 re-check)', async () => {
    const racing = method(2 * 24 * HOUR);
    const { userId } = await seedCustomer(1, [racing]);
    const cards = module.get(BillingPaymentCardRepository);
    const read = cards.listTokensForUser.bind(cards);
    jest
      .spyOn(cards, 'listTokensForUser')
      .mockImplementation(async (...args) => {
        const tokens = await read(...args);
        await seedCardRow(userId, racing.token);
        return tokens;
      });

    const summary = await service.reconcile(NOW);

    expect(gateway.detach).not.toHaveBeenCalled();
    expect(summary.orphansDetached).toBe(0);
  });

  it('continues with the next customer when listing one throws, and counts the failure (REC-03 AC 6)', async () => {
    const a = method(2 * 24 * HOUR);
    const c = method(2 * 24 * HOUR);
    await seedCustomer(1, [a]);
    const failing = await seedCustomer(2, new Error('stripe down'));
    await seedCustomer(3, [c]);

    const summary = await service.reconcile(NOW);

    expect(detachedTokens().sort()).toEqual([a.token, c.token].sort());
    expect(summary.failures).toBe(1);
    expect(summary.customersScanned).toBe(3);
    expect(logged.map(([, context]) => context)).toContainEqual({
      userId: expect.any(String),
      step: 'list',
    });
    expect(JSON.stringify(logged)).not.toContain(failing.providerCustomerId);
  });

  it('counts a detach that throws as a failure and still processes the next method (REC-03 AC 6)', async () => {
    const first = method(2 * 24 * HOUR);
    const second = method(3 * 24 * HOUR);
    await seedCustomer(1, [first, second]);
    gateway.detach.mockRejectedValueOnce(new Error('stripe down'));

    const summary = await service.reconcile(NOW);

    expect(gateway.detach).toHaveBeenCalledTimes(2);
    expect(summary.failures).toBe(1);
    expect(summary.orphansDetached).toBe(1);
    expect(logged.map(([, context]) => context)).toContainEqual({
      userId: expect.any(String),
      step: 'detach',
    });
  });

  it('counts a customer Stripe no longer has as missing (REC-01 AC 7)', async () => {
    await seedCustomer(1, 'missing');

    const summary = await service.reconcile(NOW);

    expect(summary.missingCustomers).toBe(1);
    expect(summary.failures).toBe(0);
    expect(gateway.detach).not.toHaveBeenCalled();
  });

  it('reports the summary of the spec scenario: 2 customers, 3 methods, 1 detached, 1 recent, 0 missing, 1 failure (REC-04 AC 8)', async () => {
    const m1 = method(5 * 24 * HOUR);
    const m2 = method(2 * 24 * HOUR);
    const m3 = method(HOUR);
    const { userId } = await seedCustomer(1, [m1, m2, m3]);
    await seedCardRow(userId, m1.token);
    await seedCustomer(2, new Error('stripe down'));

    const summary = await service.reconcile(NOW);

    expect(summary).toEqual({
      customersScanned: 2,
      methodsScanned: 3,
      orphansDetached: 1,
      recentSkipped: 1,
      missingCustomers: 0,
      failures: 1,
    });
    expect(detachedTokens()).toEqual([m2.token]);
  });

  it('reports no failure on a clean run, so the exit code is 0 (REC-04 AC 9)', async () => {
    await seedCustomer(1, [method(2 * 24 * HOUR)]);

    const summary = await service.reconcile(NOW);

    expect(summary.failures).toBe(0);
  });

  it('logs the summary once and no method id, token or customer id (REC-04 AC 8, 12)', async () => {
    const orphan = method(2 * 24 * HOUR);
    const kept = method(2 * 24 * HOUR);
    const { userId, providerCustomerId } = await seedCustomer(1, [
      orphan,
      kept,
    ]);
    await seedCardRow(userId, kept.token);
    const failing = await seedCustomer(2, new Error(`down ${orphan.token}`));
    gateway.detach.mockRejectedValueOnce(new Error(`refused ${orphan.token}`));

    const summary = await service.reconcile(NOW);

    const finished = logged.filter(([message]) =>
      /finished/i.test(message as string),
    );
    expect(finished).toHaveLength(1);
    expect(finished[0][1]).toEqual(summary);
    const output = JSON.stringify(logged);
    for (const secret of [
      orphan.token,
      kept.token,
      providerCustomerId,
      failing.providerCustomerId,
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it('does nothing for the simulated gateway: zero summary, no gateway call (REC-05 AC 10)', async () => {
    gateway.provider = 'simulated';
    await seedCustomer(1, [method(2 * 24 * HOUR)]);

    const summary = await service.reconcile(NOW);

    expect(summary).toEqual({
      customersScanned: 0,
      methodsScanned: 0,
      orphansDetached: 0,
      recentSkipped: 0,
      missingCustomers: 0,
      failures: 0,
    });
    expect(gateway.listCustomerPaymentMethods).not.toHaveBeenCalled();
    expect(gateway.detach).not.toHaveBeenCalled();
    expect(logged).toEqual([[expect.stringMatching(/finished/i), summary]]);
  });

  it('detaches nothing on a second run (REC-02 AC 11)', async () => {
    await seedCustomer(1, [method(2 * 24 * HOUR)]);
    await service.reconcile(NOW);
    gateway.detach.mockClear();

    const summary = await service.reconcile(NOW);

    expect(gateway.detach).not.toHaveBeenCalled();
    expect(summary.orphansDetached).toBe(0);
  });
});
