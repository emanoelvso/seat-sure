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
}
