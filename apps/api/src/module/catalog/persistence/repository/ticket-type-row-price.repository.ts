import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { TicketTypeRowPrice } from '@catalogModule/persistence/entity/ticket-type-row-price.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TicketTypeRowPriceRepository extends DefaultTypeOrmRepository<TicketTypeRowPrice> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(TicketTypeRowPrice, datasource.manager);
  }

  async findByTicketType(ticketTypeId: string): Promise<TicketTypeRowPrice[]> {
    return this.entityManager
      .createQueryBuilder(TicketTypeRowPrice, 'rowPrice')
      .where('rowPrice.ticketTypeId = :ticketTypeId', { ticketTypeId })
      .getMany();
  }
}
