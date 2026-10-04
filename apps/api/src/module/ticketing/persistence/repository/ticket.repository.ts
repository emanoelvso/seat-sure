import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { Ticket } from '@ticketingModule/persistence/entity/ticket.entity';
import { DataSource, EntityManager } from 'typeorm';

// Statuses whose ticket holds its seat. Cancelled and refunded seats can be
// sold again (AD-014).
const SOLD_STATUSES = [
  TicketStatus.ISSUED,
  TicketStatus.USED,
  TicketStatus.TRANSFERRED,
];

@Injectable()
export class TicketRepository extends DefaultTypeOrmRepository<Ticket> {
  constructor(
    @InjectDataSource('ticketing')
    readonly datasource: DataSource,
  ) {
    super(Ticket, datasource.manager);
  }

  async findSoldSeatIds(eventId: string): Promise<string[]> {
    const rows = await this.entityManager
      .createQueryBuilder(Ticket, 'ticket')
      .select('ticket.seatId', 'seatId')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('ticket.seatId IS NOT NULL')
      .andWhere('ticket.status IN (:...statuses)', { statuses: SOLD_STATUSES })
      .getRawMany<{ seatId: string }>();

    return rows.map((row) => row.seatId);
  }

  // The requested seats that already have a live ticket for the event
  async findLiveSeatIds(
    manager: EntityManager,
    eventId: string,
    seatIds: string[],
  ): Promise<string[]> {
    const rows = await manager
      .createQueryBuilder(Ticket, 'ticket')
      .select('ticket.seatId', 'seatId')
      .where('ticket.eventId = :eventId', { eventId })
      .andWhere('ticket.seatId IN (:...seatIds)', { seatIds })
      .andWhere('ticket.status IN (:...statuses)', { statuses: SOLD_STATUSES })
      .getRawMany<{ seatId: string }>();

    return rows.map((row) => row.seatId);
  }
}
