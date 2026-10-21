import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IdentityVerificationCode,
  VerificationCodePurpose,
} from '@identityModule/persistence/entity/identity-verification-code.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, IsNull } from 'typeorm';

@Injectable()
export class VerificationCodeRepository extends DefaultTypeOrmRepository<IdentityVerificationCode> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentityVerificationCode, datasource.manager);
  }

  // The latest code for this user+purpose that hasn't been superseded by a
  // newer one yet. Consumed codes are still returned here on purpose: a
  // second consume attempt must find the row and fail the `consumedAt IS
  // NULL` guard inside `markConsumed`, not silently see "no code" (which
  // would misreport as CODE_INCORRECT for a different reason).
  async findLatestLive(
    userId: string,
    purpose: VerificationCodePurpose,
  ): Promise<IdentityVerificationCode | null> {
    return this.findOne({
      where: { userId, purpose, invalidatedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async invalidateLive(
    userId: string,
    purpose: VerificationCodePurpose,
    now: Date,
  ): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityVerificationCode)
      .set({ invalidatedAt: now })
      .where('userId = :userId', { userId })
      .andWhere('purpose = :purpose', { purpose })
      .andWhere('invalidatedAt IS NULL')
      .andWhere('consumedAt IS NULL')
      .execute();
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityVerificationCode)
      .set({ failedAttempts: () => '"failedAttempts" + 1' })
      .where('id = :id', { id })
      .execute();
  }

  // Conditional UPDATE guarding the race between a double-submit and a
  // concurrent request: only the first one to land flips consumedAt.
  async markConsumed(id: string, now: Date): Promise<boolean> {
    const result = await this.entityManager
      .createQueryBuilder()
      .update(IdentityVerificationCode)
      .set({ consumedAt: now })
      .where('id = :id', { id })
      .andWhere('consumedAt IS NULL')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  // A true DELETE of every one of the user's verification codes, for account erasure
  async deleteAllForUser(userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(IdentityVerificationCode)
      .where('"userId" = :userId', { userId })
      .execute();
  }
}
