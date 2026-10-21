import { randomUUID } from 'crypto';
import { IdentityModule } from '@identityModule/identity.module';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { IdentityApi } from '@sharedModules/integration/interface/identity-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// Fails for the users listed in `stuck`, like a module that is still down
const probe = { stuck: new Set<string>() };

@AccountErasure()
@Injectable()
class StuckEraser implements AccountEraser {
  readonly name = 'stuck';

  async erase(userId: string): Promise<void> {
    if (probe.stuck.has(userId)) {
      throw new Error('stuck is down');
    }
  }
}

@Module({ providers: [StuckEraser] })
class FinishDeletionsProbeModule {}

describe('FinishAccountDeletionsUseCase (integration)', () => {
  let module: TestingModule;
  let identityApi: IdentityApi;
  let deletions: AccountDeletionRepository;
  let errorLog: jest.SpyInstance;

  const requestedAt = new Date('2026-10-20T10:00:00Z');
  const completedAt = new Date('2026-10-20T10:05:00Z');
  const now = new Date('2026-10-20T12:00:00Z');

  const insertPending = (userId: string) =>
    deletions.insertPending(deletions.entityManager, userId, requestedAt);

  const deletionOf = (userId: string) =>
    testDbClient(Tables.IdentityAccountDeletion).where({ userId }).first();

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [IdentityModule, FinishDeletionsProbeModule],
    }).compile();
    await module.init();
    identityApi = module.get<IdentityApi>(IdentityApi);
    deletions = module.get(AccountDeletionRepository);
    errorLog = jest.spyOn(module.get(AppLogger), 'error');
  });

  beforeEach(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    probe.stuck.clear();
    errorLog.mockClear();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient.destroy();
    for (const name of ['identity', 'user-profile', 'notifications']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  });

  it('completes the pending deletions it can, keeps a still-failing one pending and leaves a completed one untouched (PEND-03)', async () => {
    const recovering = randomUUID();
    const stuck = randomUUID();
    const done = randomUUID();
    await insertPending(recovering);
    await insertPending(stuck);
    await insertPending(done);
    await deletions.markCompleted(done, completedAt);
    probe.stuck.add(stuck);

    const summary = await identityApi.finishPendingAccountDeletions(now);

    expect(summary).toEqual({ pending: 2, completed: 1, failed: 1 });
    expect(new Date((await deletionOf(recovering)).completedAt)).toEqual(now);
    expect((await deletionOf(stuck)).completedAt).toBeNull();
    expect(new Date((await deletionOf(done)).completedAt)).toEqual(completedAt);
  });

  it('logs the user id and the step of a deletion that is still failing (PEND-03)', async () => {
    const stuck = randomUUID();
    await insertPending(stuck);
    probe.stuck.add(stuck);

    await identityApi.finishPendingAccountDeletions(now);

    expect(errorLog).toHaveBeenCalledWith(
      'account-erasure-failed',
      expect.objectContaining({ userId: stuck, step: 'stuck' }),
    );
  });

  it('finishes it on a later run once the failing step recovers (PEND-03)', async () => {
    const stuck = randomUUID();
    await insertPending(stuck);
    probe.stuck.add(stuck);
    await identityApi.finishPendingAccountDeletions(now);
    probe.stuck.clear();

    const summary = await identityApi.finishPendingAccountDeletions(now);

    expect(summary).toEqual({ pending: 1, completed: 1, failed: 0 });
    expect((await deletionOf(stuck)).completedAt).not.toBeNull();
  });

  it('returns zeros when nothing is pending', async () => {
    await expect(
      identityApi.finishPendingAccountDeletions(now),
    ).resolves.toEqual({ pending: 0, completed: 0, failed: 0 });
  });

  it('walks past the first page of pending deletions even when its first entries keep failing', async () => {
    const ids = Array.from({ length: 105 }, () => randomUUID()).sort();
    await testDbClient(Tables.IdentityAccountDeletion).insert(
      ids.map((userId) => ({
        id: randomUUID(),
        userId,
        completedAt: null,
      })),
    );
    ids.slice(0, 3).forEach((userId) => probe.stuck.add(userId));

    const summary = await identityApi.finishPendingAccountDeletions(now);

    expect(summary).toEqual({ pending: 105, completed: 102, failed: 3 });
  });
});
