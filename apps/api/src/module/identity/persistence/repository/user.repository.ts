import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentityUser } from '@identityModule/persistence/entity/identity-user.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRepository extends DefaultTypeOrmRepository<IdentityUser> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentityUser, datasource.manager);
  }

  async findByEmail(email: string): Promise<IdentityUser | null> {
    return this.findOne({ where: { email } });
  }

  async markEmailVerified(id: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityUser)
      .set({ emailVerifiedAt: now })
      .where('id = :id', { id })
      .execute();
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityUser)
      .set({ passwordHash })
      .where('id = :id', { id })
      .execute();
  }

  async markLastLogin(id: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(IdentityUser)
      .set({ lastLoginAt: now })
      .where('id = :id', { id })
      .execute();
  }

  // A true DELETE, bypassing the soft-delete column: used only to compensate
  // a sign-up whose profile creation failed, so the email is free again
  // immediately rather than staying reserved by a soft-deleted row.
  async hardDeleteById(id: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(IdentityUser)
      .where('id = :id', { id })
      .execute();
  }
}
