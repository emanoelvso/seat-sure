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

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentitySession)
      .set({ revokedAt: now })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }
}
