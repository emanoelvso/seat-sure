import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentityPasswordResetGrant } from '@identityModule/persistence/entity/identity-password-reset-grant.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class PasswordResetGrantRepository extends DefaultTypeOrmRepository<IdentityPasswordResetGrant> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentityPasswordResetGrant, datasource.manager);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<IdentityPasswordResetGrant | null> {
    return this.findOne({ where: { tokenHash } });
  }

  // Conditional UPDATE guarding single use, the same pattern as a
  // verification code's consume: only the first caller to land flips
  // usedAt.
  async markUsed(id: string, now: Date): Promise<boolean> {
    const result = await this.entityManager
      .createQueryBuilder()
      .update(IdentityPasswordResetGrant)
      .set({ usedAt: now })
      .where('id = :id', { id })
      .andWhere('usedAt IS NULL')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  // A true DELETE of every one of the user's password-reset grants, for account erasure
  async deleteAllForUser(userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(IdentityPasswordResetGrant)
      .where('"userId" = :userId', { userId })
      .execute();
  }
}
