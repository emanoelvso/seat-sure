import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { SeatHold } from '@ticketingModule/persistence/entity/seat-hold.entity';
import { DataSource, EntityManager } from 'typeorm';

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

  // ADR-015 claim: insert the hold, or take over an existing one only once it
  // has expired. `now` is the API clock (AD-025); Postgres now() only stamps
  // updatedAt. Returns the hold id, or null when the seat is held by someone.
  async claim(
    manager: EntityManager,
    {
      eventId,
      seatId,
      userId,
      expiresAt,
      now,
    }: {
      eventId: string;
      seatId: string;
      userId: string;
      expiresAt: Date;
      now: Date;
    },
  ): Promise<string | null> {
    const rows: { id: string }[] = await manager.query(
      `
      INSERT INTO "TicketingSeatHold" ("id", "eventId", "seatId", "userId", "expiresAt")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("eventId", "seatId") DO UPDATE
        SET "userId" = EXCLUDED."userId", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = now()
        WHERE "TicketingSeatHold"."expiresAt" < $6
      RETURNING "id"
      `,
      [randomUUID(), eventId, seatId, userId, expiresAt, now],
    );

    return rows[0]?.id ?? null;
  }

  // Holds are always hard-deleted: the unique (eventId, seatId) constraint
  // also counts soft-deleted rows, which would block the seat for good.
  async deleteForSeats(
    manager: EntityManager,
    eventId: string,
    userId: string,
    seatIds: string[],
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(SeatHold)
      .where('"eventId" = :eventId', { eventId })
      .andWhere('"userId" = :userId', { userId })
      .andWhere('"seatId" IN (:...seatIds)', { seatIds })
      .execute();
  }

  async lockForSeats(
    manager: EntityManager,
    eventId: string,
    seatIds: string[],
  ): Promise<SeatHold[]> {
    return manager
      .createQueryBuilder(SeatHold, 'hold')
      .setLock('pessimistic_write')
      .where('hold.eventId = :eventId', { eventId })
      .andWhere('hold.seatId IN (:...seatIds)', { seatIds })
      .getMany();
  }

  // Every hold of the user, expired or not; hard delete like the others
  async deleteForUser(userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(SeatHold)
      .where('"userId" = :userId', { userId })
      .execute();
  }
}
