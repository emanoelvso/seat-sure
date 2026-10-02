import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { SeatHold } from '@ticketingModule/persistence/entity/seat-hold.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class SeatHoldRepository extends DefaultTypeOrmRepository<SeatHold> {
  constructor(
    @InjectDataSource('ticketing')
    readonly datasource: DataSource,
  ) {
    super(SeatHold, datasource.manager);
  }

  // A hold blocks its seat while it expires at or after `now` (ADR-015
  // reclaims a hold only once `expiresAt < now`).
  async findActiveSeatIds(eventId: string, now: Date): Promise<string[]> {
    const rows = await this.entityManager
      .createQueryBuilder(SeatHold, 'hold')
      .select('hold.seatId', 'seatId')
      .where('hold.eventId = :eventId', { eventId })
      .andWhere('hold.expiresAt >= :now', { now })
      .getRawMany<{ seatId: string }>();

    return rows.map((row) => row.seatId);
  }
}
