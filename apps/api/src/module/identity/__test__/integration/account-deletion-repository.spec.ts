import { randomUUID } from 'crypto';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('AccountDeletionRepository (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let repository: AccountDeletionRepository;

  const requestedAt = new Date('2026-10-20T10:00:00Z');
  const completedAt = new Date('2026-10-20T10:05:00Z');

  const rowsOf = (userId: string) =>
    testDbClient(Tables.IdentityAccountDeletion).where({ userId });

  const insertPending = (userId: string, at = requestedAt) =>
    repository.insertPending(dataSource.manager, userId, at);

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('identity'));
    repository = module.get(AccountDeletionRepository);
  });

  beforeEach(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('insertPending (PEND-01)', () => {
    it('records a pending deletion with the request time and no completion time', async () => {
      const userId = randomUUID();

      await insertPending(userId);

      const rows = await rowsOf(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0].completedAt).toBeNull();
      expect(new Date(rows[0].createdAt).getTime()).toBe(requestedAt.getTime());
    });

    it('keeps one row and does not throw when called twice for the same user', async () => {
      const userId = randomUUID();
      await insertPending(userId, requestedAt);

      await expect(
        insertPending(userId, new Date('2026-10-20T11:00:00Z')),
      ).resolves.toBeUndefined();

      const rows = await rowsOf(userId);
      expect(rows).toHaveLength(1);
      expect(new Date(rows[0].createdAt).getTime()).toBe(requestedAt.getTime());
    });
  });

  describe('exists (DEL-03)', () => {
    it('is true for a pending deletion', async () => {
      const userId = randomUUID();
      await insertPending(userId);

      await expect(repository.exists(userId)).resolves.toBe(true);
    });

    it('is true for a completed deletion', async () => {
      const userId = randomUUID();
      await insertPending(userId);
      await repository.markCompleted(userId, completedAt);

      await expect(repository.exists(userId)).resolves.toBe(true);
    });

    it('is false for a user with no deletion', async () => {
      await insertPending(randomUUID());

      await expect(repository.exists(randomUUID())).resolves.toBe(false);
    });
  });

  describe('listPendingUserIds (PEND-03)', () => {
    it('excludes completed deletions', async () => {
      const pending = randomUUID();
      const done = randomUUID();
      await insertPending(pending);
      await insertPending(done);
      await repository.markCompleted(done, completedAt);

      await expect(repository.listPendingUserIds(null, 100)).resolves.toEqual([
        pending,
      ]);
    });

    it('pages by user id: limit applies and the cursor resumes after the last id', async () => {
      const ids = [randomUUID(), randomUUID(), randomUUID()].sort();
      for (const id of ids) {
        await insertPending(id);
      }

      const first = await repository.listPendingUserIds(null, 2);
      const second = await repository.listPendingUserIds(first[1], 2);
      const third = await repository.listPendingUserIds(second[0], 2);

      expect(first).toEqual([ids[0], ids[1]]);
      expect(second).toEqual([ids[2]]);
      expect(third).toEqual([]);
    });
  });

  describe('markCompleted (PEND-01)', () => {
    it('sets the completion time', async () => {
      const userId = randomUUID();
      await insertPending(userId);

      await repository.markCompleted(userId, completedAt);

      const rows = await rowsOf(userId);
      expect(new Date(rows[0].completedAt).getTime()).toBe(
        completedAt.getTime(),
      );
    });

    it('keeps the first completion time when called again', async () => {
      const userId = randomUUID();
      await insertPending(userId);
      await repository.markCompleted(userId, completedAt);

      await repository.markCompleted(userId, new Date('2026-10-21T00:00:00Z'));

      const rows = await rowsOf(userId);
      expect(new Date(rows[0].completedAt).getTime()).toBe(
        completedAt.getTime(),
      );
    });
  });
});
