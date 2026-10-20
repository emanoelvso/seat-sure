import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentityAccountDeletion } from '@identityModule/persistence/entity/identity-account-deletion.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class AccountDeletionRepository extends DefaultTypeOrmRepository<IdentityAccountDeletion> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentityAccountDeletion, datasource.manager);
  }

  // Records the request once per user: a second call (a retry, or a
  // concurrent deletion) keeps the first row and its request time.
  async insertPending(
    manager: EntityManager,
    userId: string,
    now: Date,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(IdentityAccountDeletion)
      .values({
        id: randomUUID(),
        userId,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .orIgnore()
      .execute();
  }

  // True for a pending or a completed deletion
  async exists(userId: string): Promise<boolean> {
    return this.entityManager
      .createQueryBuilder(IdentityAccountDeletion, 'deletion')
      .where('deletion.userId = :userId', { userId })
      .getExists();
  }

  // Keyset pages ordered by user id; a deletion that keeps failing stays in
  // the table, so the caller walks forward with the last id it saw.
  async listPendingUserIds(
    afterUserId: string | null,
    limit: number,
  ): Promise<string[]> {
    const query = this.entityManager
      .createQueryBuilder(IdentityAccountDeletion, 'deletion')
      .select('deletion.userId', 'userId')
      .where('deletion.completedAt IS NULL')
      .orderBy('deletion.userId', 'ASC')
      .limit(limit);
    if (afterUserId) {
      query.andWhere('deletion.userId > :afterUserId', { afterUserId });
    }
    const rows = await query.getRawMany<{ userId: string }>();
    return rows.map((row) => row.userId);
  }

  // Keeps the first completion time when called again
  async markCompleted(userId: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityAccountDeletion)
      .set({ completedAt: now })
      .where('userId = :userId', { userId })
      .andWhere('completedAt IS NULL')
      .execute();
  }
}
