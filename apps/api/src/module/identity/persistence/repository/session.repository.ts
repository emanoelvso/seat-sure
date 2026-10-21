import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentitySession } from '@identityModule/persistence/entity/identity-session.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class SessionRepository extends DefaultTypeOrmRepository<IdentitySession> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentitySession, datasource.manager);
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<IdentitySession | null> {
    return this.findOne({ where: { refreshTokenHash } });
  }

  async findByPreviousRefreshTokenHash(
    previousRefreshTokenHash: string,
  ): Promise<IdentitySession | null> {
    return this.findOne({ where: { previousRefreshTokenHash } });
  }

  async rotate(
    id: string,
    fields: {
      refreshTokenHash: string;
      previousRefreshTokenHash: string;
      rotatedAt: Date;
    },
  ): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentitySession)
      .set(fields)
      .where('id = :id', { id })
      .execute();
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentitySession)
      .set({ revokedAt: now })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  // A true DELETE of every one of the user's sessions, for account erasure
  async deleteAllForUser(userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(IdentitySession)
      .where('"userId" = :userId', { userId })
      .execute();
  }
}
