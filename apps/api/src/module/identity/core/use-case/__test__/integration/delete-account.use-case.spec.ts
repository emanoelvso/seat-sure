import { randomUUID } from 'crypto';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { DeleteAccountUseCase } from '@identityModule/core/use-case/delete-account.use-case';
import { IdentityModule } from '@identityModule/identity.module';
import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  AccountEraser,
  AccountErasure,
  AccountErasureBlocker,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// What the fake eraser sees when Identity calls it, and how it behaves
const probe = {
  erased: [] as {
    userId: string;
    sessionRevokedAt: Date | null;
    deletionRecorded: boolean;
  }[],
  fail: false,
  blocker: null as AccountErasureBlocker | null,
};

@AccountErasure()
@Injectable()
class SnapshotEraser implements AccountEraser {
  readonly name = 'snapshot';

  async findBlocker(): Promise<AccountErasureBlocker | null> {
    return probe.blocker;
  }

  async erase(userId: string): Promise<void> {
    const session = await testDbClient(Tables.IdentitySession)
      .where({ userId })
      .first();
    const deletion = await testDbClient(Tables.IdentityAccountDeletion)
      .where({ userId })
      .first();
    probe.erased.push({
      userId,
      sessionRevokedAt: session?.revokedAt ?? null,
      deletionRecorded: !!deletion,
    });
    if (probe.fail) {
      throw new Error('snapshot is down');
    }
  }
}

@Module({ providers: [SnapshotEraser] })
class DeleteAccountProbeModule {}

describe('DeleteAccountUseCase (integration)', () => {
  let module: TestingModule;
  let useCase: DeleteAccountUseCase;

  const now = new Date('2026-10-20T12:00:00Z');

  const seedAccount = async () => {
    const userId = randomUUID();
    await testDbClient(Tables.IdentityUser).insert({
      id: userId,
      email: `delete-${userId}@example.com`,
      passwordHash: 'x'.repeat(60),
    });
    await testDbClient(Tables.IdentitySession).insert({
      id: randomUUID(),
      userId,
      refreshTokenHash: randomUUID().replace(/-/g, ''),
      persistent: true,
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    });
    return userId;
  };

  const userRows = (userId: string) =>
    testDbClient(Tables.IdentityUser).where({ id: userId });
  const sessionRows = (userId: string) =>
    testDbClient(Tables.IdentitySession).where({ userId });
  const deletionRows = (userId: string) =>
    testDbClient(Tables.IdentityAccountDeletion).where({ userId });

  const cleanTables = async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityUser).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [IdentityModule, DeleteAccountProbeModule],
    }).compile();
    await module.init();
    useCase = module.get(DeleteAccountUseCase);
  });

  beforeEach(async () => {
    await cleanTables();
    probe.erased = [];
    probe.fail = false;
    probe.blocker = null;
  });

  afterAll(async () => {
    await cleanTables();
    await testDbClient.destroy();
    for (const name of ['identity', 'user-profile', 'notifications']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  });

  describe.each(['DELETE', '  DELETE  '])(
    'confirmation %j (DEL-01)',
    (typed) => {
      it('returns true and erases the account', async () => {
        const userId = await seedAccount();

        await expect(useCase.execute(userId, typed, now)).resolves.toBe(true);

        expect(await userRows(userId)).toEqual([]);
        expect((await deletionRows(userId))[0].completedAt).not.toBeNull();
      });
    },
  );

  it.each(['delete', 'DELETED', ''])(
    'refuses confirmation %j with DELETION_NOT_CONFIRMED and changes nothing (DEL-01)',
    async (typed) => {
      const userId = await seedAccount();

      await expect(useCase.execute(userId, typed, now)).rejects.toMatchObject({
        reason: 'DELETION_NOT_CONFIRMED',
      });

      expect(await userRows(userId)).toHaveLength(1);
      expect((await sessionRows(userId))[0].revokedAt).toBeNull();
      expect(await deletionRows(userId)).toEqual([]);
      expect(probe.erased).toEqual([]);
    },
  );

  it('refuses with ACCOUNT_HAS_ACTIVE_ORDERS when an eraser reports a blocker, changing nothing (DEL-02)', async () => {
    const userId = await seedAccount();
    probe.blocker = 'ACCOUNT_HAS_ACTIVE_ORDERS';

    const attempt = useCase.execute(userId, 'DELETE', now);

    await expect(attempt).rejects.toBeInstanceOf(IdentityException);
    await expect(attempt).rejects.toMatchObject({
      reason: 'ACCOUNT_HAS_ACTIVE_ORDERS',
    });
    expect(await userRows(userId)).toHaveLength(1);
    expect((await sessionRows(userId))[0].revokedAt).toBeNull();
    expect(await deletionRows(userId)).toEqual([]);
    expect(probe.erased).toEqual([]);
  });

  it('records the deletion and revokes the sessions before any eraser runs (DEL-03, PEND-01)', async () => {
    const userId = await seedAccount();

    await useCase.execute(userId, 'DELETE', now);

    expect(probe.erased).toHaveLength(1);
    expect(probe.erased[0].userId).toBe(userId);
    expect(probe.erased[0].deletionRecorded).toBe(true);
    expect(probe.erased[0].sessionRevokedAt).not.toBeNull();
  });

  it('still returns true and leaves the deletion pending when an eraser fails (PEND-01)', async () => {
    const userId = await seedAccount();
    probe.fail = true;

    await expect(useCase.execute(userId, 'DELETE', now)).resolves.toBe(true);

    expect(await userRows(userId)).toHaveLength(1);
    expect((await sessionRows(userId))[0].revokedAt).not.toBeNull();
    const deletions = await deletionRows(userId);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].completedAt).toBeNull();
  });

  it('resolves both of 2 concurrent calls and leaves one completed deletion', async () => {
    const userId = await seedAccount();

    const results = await Promise.all([
      useCase.execute(userId, 'DELETE', now),
      useCase.execute(userId, 'DELETE', now),
    ]);

    expect(results).toEqual([true, true]);
    const deletions = await deletionRows(userId);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].completedAt).not.toBeNull();
    expect(await userRows(userId)).toEqual([]);
  });
});
