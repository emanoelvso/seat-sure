import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';
import { SeatMap } from '../entity/seat-map.entity';

@Injectable()
export class SeatMapRepository extends DefaultTypeOrmRepository<SeatMap> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(SeatMap, datasource.manager);
  }
}
