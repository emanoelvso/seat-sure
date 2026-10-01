import { MigrationInterface, QueryRunner } from 'typeorm';

// Demo seat availability (AD-013): issued tickets and long-lived holds for
// every published event with a seat map, over the seats of its ticket types'
// sections. It reads Catalog's tables, so Catalog must migrate first. Row 7
// stays free, so every section keeps a row of 13 free seats (more than the
// largest seeded maxPerOrder, 8). down() deletes every row of the demo user.
const DEMO_USER_ID = 'de000000-0000-4000-8000-000000000000';
const HOLD_EXPIRES_AT = '2099-12-31T00:00:00Z';

// SPEC_DEVIATION: the design picks each seat on its own hash byte
// (b = first byte of md5(eventId || seatId), b < 115 sold, 115 <= b < 140
// held). Here the seats of each event section are ranked by that same md5, and
// the first 115/256 are sold and the next 25/256 held.
// Reason: per-seat draws give each event a random share. With the 20 seeded
// concerts (548 seats each), 110 of 200 simulated resets put some event outside
// the 40-50% sold / 7-13% held bands the seed check requires. Ranking sells 62
// and holds 13 of every section's 137 seats outside row 7.
const RANKED_SEATS = `
  SELECT e."id" AS "eventId",
         s."id" AS "seatId",
         md5(e."id"::text || s."id"::text) AS "hash",
         row_number() OVER (
           PARTITION BY e."id", tt."sectionKey"
           ORDER BY md5(e."id"::text || s."id"::text)
         ) AS "rank",
         count(*) OVER (PARTITION BY e."id", tt."sectionKey") AS "total"
    FROM "CatalogEvent" e
    JOIN "CatalogTicketType" tt
      ON tt."eventId" = e."id" AND tt."deletedAt" IS NULL
    JOIN "CatalogSeat" s
      ON s."seatMapId" = e."seatMapId"
     AND s."sectionKey" = tt."sectionKey"
     AND s."deletedAt" IS NULL
     AND s."row" <> '7'
   WHERE e."status" = 'published' AND e."seatMapId" IS NOT NULL
`;

export class Migration1790881300000 implements MigrationInterface {
  name = 'Migration1790881300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Two queries: naming a missing table would fail the whole statement.
    const [{ exists }] = await queryRunner.query(
      `SELECT to_regclass('public."CatalogSeat"') IS NOT NULL AS "exists"`,
    );
    const [{ hasSeats }] = exists
      ? await queryRunner.query(
          `SELECT EXISTS (SELECT 1 FROM "CatalogSeat") AS "hasSeats"`,
        )
      : [{ hasSeats: false }];

    if (!hasSeats) {
      throw new Error(
        'Run the catalog migrations first: the demo seat availability seed reads CatalogSeat, which is missing or empty.',
      );
    }

    await queryRunner.query(
      `
      INSERT INTO "TicketingTicket" ("id", "eventId", "seatId", "userId", "code", "status")
      SELECT gen_random_uuid(), r."eventId", r."seatId", $1, 'DEMO-' || left(r."hash", 12), 'issued'
        FROM (${RANKED_SEATS}) r
       WHERE r."rank" <= round(r."total" * 115 / 256.0)
    `,
      [DEMO_USER_ID],
    );

    await queryRunner.query(
      `
      INSERT INTO "TicketingSeatHold" ("id", "eventId", "seatId", "userId", "expiresAt")
      SELECT gen_random_uuid(), r."eventId", r."seatId", $1, $2
        FROM (${RANKED_SEATS}) r
       WHERE r."rank" > round(r."total" * 115 / 256.0)
         AND r."rank" <= round(r."total" * 140 / 256.0)
    `,
      [DEMO_USER_ID, HOLD_EXPIRES_AT],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "TicketingTicket" WHERE "userId" = $1`,
      [DEMO_USER_ID],
    );
    await queryRunner.query(
      `DELETE FROM "TicketingSeatHold" WHERE "userId" = $1`,
      [DEMO_USER_ID],
    );
  }
}
