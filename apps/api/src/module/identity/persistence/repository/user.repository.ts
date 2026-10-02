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
}
