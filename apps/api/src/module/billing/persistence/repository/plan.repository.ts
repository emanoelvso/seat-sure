import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Plan } from '../entity/plan.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PlanRepository extends DefaultTypeOrmRepository<Plan> {
  constructor(
    @InjectDataSource('billing')
    readonly dataSource: DataSource,
  ) {
    super(Plan, dataSource.manager);
  }
}
