import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { UserProfileUser } from '@userProfileModule/persistence/entity/user-profile-user.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class UserProfileUserRepository extends DefaultTypeOrmRepository<UserProfileUser> {
  constructor(
    @InjectDataSource('user-profile')
    readonly datasource: DataSource,
  ) {
    super(UserProfileUser, datasource.manager);
  }

  // A plain INSERT (not `save`'s upsert-by-id): the id is supplied by the
  // caller, so a second create for the same id must violate the PK and
  // reject, never silently overwrite the row.
  async create(data: {
    id: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .insert()
      .into(UserProfileUser)
      .values(data)
      .execute();
  }

  // Full replacement of the editable columns; `null` clears a column.
  // Returns false when no row has the given id.
  async updateProfile(
    id: string,
    data: {
      firstName: string;
      lastName: string;
      state: string | null;
      city: string | null;
      birthDate: string | null;
      phoneCountryCode: string | null;
      phoneNumber: string | null;
      zipCode: string | null;
    },
  ): Promise<boolean> {
    const result = await this.entityManager
      .createQueryBuilder()
      .update(UserProfileUser)
      .set(data)
      .where('id = :id', { id })
      .execute();

    return (result.affected ?? 0) > 0;
  }
}
