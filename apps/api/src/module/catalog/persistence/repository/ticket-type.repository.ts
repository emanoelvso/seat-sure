import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { TicketType } from '@catalogModule/persistence/entity/ticket-type.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TicketTypeRepository extends DefaultTypeOrmRepository<TicketType> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(TicketType, datasource.manager);
  }

  async findByEvent(eventId: string): Promise<TicketType[]> {
    return this.entityManager
      .createQueryBuilder(TicketType, 'ticketType')
      .where('ticketType.eventId = :eventId', { eventId })
      .orderBy('ticketType.priceCents', 'DESC')
      .addOrderBy('ticketType.name', 'ASC')
      .getMany();
  }
}
