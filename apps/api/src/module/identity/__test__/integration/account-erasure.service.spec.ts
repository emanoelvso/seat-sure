import { randomUUID } from 'crypto';
import { AccountErasureService } from '@identityModule/core/service/account-erasure.service';
import { IdentityModule } from '@identityModule/identity.module';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  AccountEraser,
  AccountErasure,
  AccountErasureBlocker,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// What the fake erasers record and how they behave, set per test
const probe = {
  calls: [] as string[],
  failing: new Set<string>(),
  blockers: new Map<string, AccountErasureBlocker | null>(),
};

abstract class FakeEraser implements AccountEraser {
  abstract readonly name: string;

  async erase(userId: string): Promise<void> {
    probe.calls.push(`${this.name}:${userId}`);
    if (probe.failing.has(this.name)) {
      throw new Error(`${this.name} is down`);
    }
  }
}

// No findBlocker: Identity must skip it
@AccountErasure()
@Injectable()
class FakeAlphaEraser extends FakeEraser {
  readonly name = 'fake-alpha';
}

@AccountErasure()
@Injectable()
class FakeBravoEraser extends FakeEraser {
  readonly name = 'fake-bravo';

  async findBlocker(): Promise<AccountErasureBlocker | null> {
    return probe.blockers.get(this.name) ?? null;
  }
}

@AccountErasure()
@Injectable()
class FakeCharlieEraser extends FakeEraser {
  readonly name = 'fake-charlie';

  async findBlocker(): Promise<AccountErasureBlocker | null> {
    return probe.blockers.get(this.name) ?? null;
  }
}

@Module({
  providers: [FakeAlphaEraser, FakeBravoEraser, FakeCharlieEraser],
})
class ErasureProbeModule {}

describe('AccountErasureService (integration)', () => {
  let module: TestingModule;
  let service: AccountErasureService;
  let deletions: AccountDeletionRepository;
  let errorLog: jest.SpyInstance;

  const now = new Date('2026-10-20T12:00:00Z');
  const FAKE_NAMES = ['fake-alpha', 'fake-bravo', 'fake-charlie'];

  const seedAccount = async () => {
    const userId = randomUUID();
    const email = `erase-${userId}@example.com`;
    await testDbClient(Tables.IdentityUser).insert({
      id: userId,
      email,
      passwordHash: 'x'.repeat(60),
    });
    await testDbClient(Tables.IdentitySession).insert({
      id: randomUUID(),
      userId,
      refreshTokenHash: randomUUID().replace(/-/g, ''),
      persistent: true,
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });
    await testDbClient(Tables.IdentityVerificationCode).insert({
      id: randomUUID(),
      userId,
      purpose: 'verify_email',
      codeHash: 'h'.repeat(60),
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });
    await testDbClient(Tables.IdentityPasswordResetGrant).insert({
      id: randomUUID(),
      userId,
      tokenHash: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });
    await testDbClient(Tables.IdentityLoginThrottle).insert({
      id: randomUUID(),
      email,
      failedCount: 2,
      windowStartedAt: now,
    });
    await deletions.insertPending(
      module.get<DataSource>(getDataSourceToken('identity')).manager,
      userId,
      now,
    );
    return { userId, email };
  };

  const identityRowsOf = async (userId: string, email: string) => ({
    users: await testDbClient(Tables.IdentityUser).where({ id: userId }),
    sessions: await testDbClient(Tables.IdentitySession).where({ userId }),
    codes: await testDbClient(Tables.IdentityVerificationCode).where({
      userId,
    }),
    grants: await testDbClient(Tables.IdentityPasswordResetGrant).where({
      userId,
    }),
    throttles: await testDbClient(Tables.IdentityLoginThrottle).where({
      email,
    }),
  });

  const deletionOf = (userId: string) =>
    testDbClient(Tables.IdentityAccountDeletion).where({ userId }).first();

  const fakeCalls = () =>
    probe.calls.filter((call) => FAKE_NAMES.includes(call.split(':')[0]));

  const cleanTables = async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient(Tables.IdentityLoginThrottle).del();
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityUser).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [IdentityModule, ErasureProbeModule],
    }).compile();
    await module.init();
    service = module.get(AccountErasureService);
    deletions = module.get(AccountDeletionRepository);
    errorLog = jest.spyOn(module.get(AppLogger), 'error');
  });

  beforeEach(async () => {
    await cleanTables();
    probe.calls = [];
    probe.failing.clear();
    probe.blockers.clear();
    errorLog.mockClear();
  });

  afterAll(async () => {
    await cleanTables();
    await testDbClient.destroy();
    const dataSources = ['identity', 'user-profile', 'notifications'].map(
      (name) => module.get<DataSource>(getDataSourceToken(name)),
    );
    for (const dataSource of dataSources) {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  });

  describe('erase (DEL-04, PEND-01, PEND-03)', () => {
    it("calls every eraser once with the user id, deletes Identity's rows and completes the deletion", async () => {
      const { userId, email } = await seedAccount();

      const result = await service.erase(userId, now);

      expect(result).toEqual({ failedSteps: [] });
      expect(fakeCalls()).toEqual(
        FAKE_NAMES.map((name) => `${name}:${userId}`),
      );
      expect(await identityRowsOf(userId, email)).toEqual({
        users: [],
        sessions: [],
        codes: [],
        grants: [],
        throttles: [],
      });
      expect(new Date((await deletionOf(userId)).completedAt)).toEqual(now);
    });

    it("keeps another user's Identity rows", async () => {
      const target = await seedAccount();
      const other = await seedAccount();

      await service.erase(target.userId, now);

      const rows = await identityRowsOf(other.userId, other.email);
      expect(rows.users).toHaveLength(1);
      expect(rows.sessions).toHaveLength(1);
      expect(rows.codes).toHaveLength(1);
      expect(rows.grants).toHaveLength(1);
      expect(rows.throttles).toHaveLength(1);
    });

    it('runs the other erasers, keeps the Identity rows and leaves the deletion pending when one throws', async () => {
      const { userId, email } = await seedAccount();
      probe.failing.add('fake-bravo');

      const result = await service.erase(userId, now);

      expect(result).toEqual({ failedSteps: ['fake-bravo'] });
      expect(fakeCalls()).toEqual(
        FAKE_NAMES.map((name) => `${name}:${userId}`),
      );
      const rows = await identityRowsOf(userId, email);
      expect(rows.users).toHaveLength(1);
      expect(rows.sessions).toHaveLength(1);
      expect(rows.codes).toHaveLength(1);
      expect(rows.grants).toHaveLength(1);
      expect(rows.throttles).toHaveLength(1);
      expect((await deletionOf(userId)).completedAt).toBeNull();
    });

    it('logs the user id and the failed step', async () => {
      const { userId } = await seedAccount();
      probe.failing.add('fake-charlie');

      await service.erase(userId, now);

      expect(errorLog).toHaveBeenCalledWith(
        'account-erasure-failed',
        expect.objectContaining({ userId, step: 'fake-charlie' }),
      );
    });

    it('completes the deletion when re-run after the failing eraser recovers', async () => {
      const { userId, email } = await seedAccount();
      probe.failing.add('fake-bravo');
      await service.erase(userId, now);
      probe.failing.clear();

      const result = await service.erase(userId, now);

      expect(result).toEqual({ failedSteps: [] });
      expect((await identityRowsOf(userId, email)).users).toEqual([]);
      expect((await deletionOf(userId)).completedAt).not.toBeNull();
    });

    it('still completes when the user row is already gone', async () => {
      const { userId } = await seedAccount();
      await testDbClient(Tables.IdentitySession).where({ userId }).del();
      await testDbClient(Tables.IdentityVerificationCode)
        .where({ userId })
        .del();
      await testDbClient(Tables.IdentityPasswordResetGrant)
        .where({ userId })
        .del();
      await testDbClient(Tables.IdentityUser).where({ id: userId }).del();

      const result = await service.erase(userId, now);

      expect(result).toEqual({ failedSteps: [] });
      expect((await deletionOf(userId)).completedAt).not.toBeNull();
    });
  });

  describe('findBlocker (DEL-02)', () => {
    it('returns the first blocker in eraser-name order', async () => {
      probe.blockers.set('fake-bravo', 'ACCOUNT_HAS_ACTIVE_ORDERS');
      probe.blockers.set('fake-charlie', 'ACCOUNT_HAS_ACTIVE_ORDERS');

      await expect(service.findBlocker(randomUUID(), now)).resolves.toBe(
        'ACCOUNT_HAS_ACTIVE_ORDERS',
      );
    });

    it('returns null when no eraser reports a blocker, skipping erasers without a check', async () => {
      await expect(service.findBlocker(randomUUID(), now)).resolves.toBeNull();
    });
  });
});
