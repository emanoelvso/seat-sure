import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Seat } from '@catalogModule/persistence/entity/seat.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatRepository extends DefaultTypeOrmRepository<Seat> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(Seat, datasource.manager);
  }

  async findBySection(seatMapId: string, sectionKey: string): Promise<Seat[]> {
    return this.entityManager
      .createQueryBuilder(Seat, 'seat')
      .where('seat.seatMapId = :seatMapId', { seatMapId })
      .andWhere('seat.sectionKey = :sectionKey', { sectionKey })
      .orderBy('seat.y', 'ASC')
      .addOrderBy('seat.x', 'ASC')
      .getMany();
  }
}
