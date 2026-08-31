import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { User } from '../entity/user.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRepository extends DefaultTypeOrmRepository<User> {
  constructor(@InjectDataSource('identity') readonly dataSource: DataSource) {
    super(User, dataSource.manager);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: {
        email,
      },
    });
  }
}
