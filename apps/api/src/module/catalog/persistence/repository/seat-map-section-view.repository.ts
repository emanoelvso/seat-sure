import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { SeatMapSectionView } from '@catalogModule/persistence/entity/seat-map-section-view.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatMapSectionViewRepository extends DefaultTypeOrmRepository<SeatMapSectionView> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(SeatMapSectionView, datasource.manager);
  }
}
