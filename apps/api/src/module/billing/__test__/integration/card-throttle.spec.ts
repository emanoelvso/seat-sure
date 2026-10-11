import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { CardThrottleService } from '@billingModule/core/service/card-throttle.service';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import {
  initializeTransactionalContext,
  runInTransaction,
} from 'typeorm-transactional';

describe('CardThrottleService (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let service: CardThrottleService;

  const T0 = new Date('2026-10-11T12:00:00Z');
  const after = (minutes: number, from = T0) =>
    new Date(from.getTime() + minutes * 60_000);

  const fail = async (userId: string, times: number, at = T0) => {
    for (let i = 0; i < times; i += 1) {
      await service.recordFailure(userId, at);
    }
  };

  const limited = (userId: string, now: Date) =>
    service.assertNotLocked(userId, now).then(
      () => false,
      (error: unknown) =>
        error instanceof BillingException &&
        error.reason === 'CARD_ATTEMPTS_LIMITED',
    );

  const rowOf = (userId: string) =>
    testDbClient(Tables.BillingCardThrottle).where({ userId }).first();

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingPersistenceModule],
      providers: [CardThrottleService],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    service = module.get(CardThrottleService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingCardThrottle).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingCardThrottle).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('does not lock after 4 failures', async () => {
    const userId = randomUUID();
    await fail(userId, 4);

    expect(await limited(userId, T0)).toBe(false);
  });

  it('locks for 15 minutes after the 5th failure inside the window (AC 1)', async () => {
    const userId = randomUUID();
    await fail(userId, 5);

    expect(await limited(userId, T0)).toBe(true);
    expect(await limited(userId, after(14.9))).toBe(true);
    expect((await rowOf(userId)).lockedUntil).toEqual(after(15));
  });

  it('accepts operations again once the lock ends, with a fresh count (AC 4, edge)', async () => {
    const userId = randomUUID();
    await fail(userId, 5);

    // lock is `now < lockedUntil`: exactly at the end it is open
    expect(await limited(userId, after(15))).toBe(false);

    // the counter starts over: 4 more failures do not lock again
    await fail(userId, 4, after(16));
    const row = await rowOf(userId);
    expect(row.failedCount).toBe(4);
    expect(row.lockedUntil).toBeNull();
    expect(await limited(userId, after(16))).toBe(false);
  });

  it('restarts the count when the previous failure is older than the window', async () => {
    const userId = randomUUID();
    await fail(userId, 4);
    await service.recordFailure(userId, after(16));

    expect((await rowOf(userId)).failedCount).toBe(1);
    expect(await limited(userId, after(16))).toBe(false);
  });

  it('clear resets the counter to 0 (AC 5)', async () => {
    const userId = randomUUID();
    await fail(userId, 4);
    await service.clear(userId);

    expect(await rowOf(userId)).toBeUndefined();
    await fail(userId, 4);
    expect(await limited(userId, T0)).toBe(false);
  });

  it("keeps each user's counter separate (AC 9)", async () => {
    const blocked = randomUUID();
    const other = randomUUID();
    await fail(blocked, 5);

    expect(await limited(blocked, T0)).toBe(true);
    expect(await limited(other, T0)).toBe(false);
  });

  it('counts concurrent failures (edge)', async () => {
    const userId = randomUUID();
    await Promise.all(
      Array.from({ length: 5 }, () => service.recordFailure(userId, T0)),
    );

    expect(await limited(userId, T0)).toBe(true);
  });

  it('keeps a failure recorded inside a transaction that then throws (AC 10)', async () => {
    const userId = randomUUID();

    await expect(
      runInTransaction(
        async () => {
          await service.recordFailure(userId, T0);
          throw new Error('operation failed');
        },
        { connectionName: 'billing' },
      ),
    ).rejects.toThrow('operation failed');

    expect((await rowOf(userId)).failedCount).toBe(1);
  });
});
