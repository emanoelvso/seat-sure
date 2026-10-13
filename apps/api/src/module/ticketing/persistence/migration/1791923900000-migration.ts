import { MigrationInterface, QueryRunner } from 'typeorm';

// Seat maps now belong to their venue (Catalog 1791923400000), so events at
// other venues lost their map. This drops the demo availability (1790881300000)
// left on seats that are no longer on their event's map. Rows for events that
// kept their map are untouched: their seat ids did not change. It reads
// Catalog's tables, as the seed does. A non-demo ticket, hold or order item on
// such a seat aborts the migration, and TypeORM rolls it back.
const DEMO_USER_ID = 'de000000-0000-4000-8000-000000000000';

// True when `seat` is not a seat of the current map of event `event`
const offMap = (event: string, seat: string) => `
  NOT EXISTS (
    SELECT 1
      FROM "CatalogEvent" e
      JOIN "CatalogSeat" s ON s."seatMapId" = e."seatMapId"
     WHERE e."id" = ${event} AND s."id" = ${seat}
  )`;

export class Migration1791923900000 implements MigrationInterface {
  name = 'Migration1791923900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ tickets, holds, orderItems }] = await queryRunner.query(
      `
      SELECT
        (SELECT count(*)::int FROM "TicketingTicket" t
          WHERE t."userId" <> $1 AND t."seatId" IS NOT NULL
            AND ${offMap('t."eventId"', 't."seatId"')}) AS "tickets",
        (SELECT count(*)::int FROM "TicketingSeatHold" h
          WHERE h."userId" <> $1
            AND ${offMap('h."eventId"', 'h."seatId"')}) AS "holds",
        (SELECT count(*)::int FROM "TicketingOrderItem" i
           JOIN "TicketingOrder" o ON o."id" = i."orderId"
          WHERE o."userId" <> $1
            AND ${offMap('o."eventId"', 'i."seatId"')}) AS "orderItems"
      `,
      [DEMO_USER_ID],
    );

    if (tickets + holds + orderItems > 0) {
      throw new Error(
        `Non-demo rows reference seats off their event's seat map: tickets ${tickets}, holds ${holds}, order items ${orderItems}`,
      );
    }

    await queryRunner.query(
      `DELETE FROM "TicketingTicket" t
        WHERE t."userId" = $1 AND t."seatId" IS NOT NULL
          AND ${offMap('t."eventId"', 't."seatId"')}`,
      [DEMO_USER_ID],
    );
    await queryRunner.query(
      `DELETE FROM "TicketingSeatHold" h
        WHERE h."userId" = $1
          AND ${offMap('h."eventId"', 'h."seatId"')}`,
      [DEMO_USER_ID],
    );
  }

  // The deleted rows were demo availability for events that no longer have a
  // seat map, so there is nothing to restore.
  public async down(): Promise<void> {}
}
