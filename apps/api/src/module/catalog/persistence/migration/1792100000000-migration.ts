import { MigrationInterface, QueryRunner } from 'typeorm';

// Gives every published event that has no seat map one that belongs to its
// venue (ADR-011, 1791923802769). Each venue gets a copy of a seeded layout:
// Football Stadium for football, Concentric Arena for everything else. The
// copy carries the template's seats, perks and section view ratings. An event
// with no ticket types gets the template's, with the fees and front-row premium
// of 1791145900000 and 1791941200000. An event that kept its ticket types when
// it lost its map (1791923400000) keeps them and gets the front-row premium.
// An event whose ticket types name a section the layout lacks is left alone. Copied map ids are derived from the
// venue and the template, so down() finds them again.
const ARENA_ID = '11111111-1111-4111-8111-111111111111'; // Concentric Arena
const STADIUM_ID = '22222222-2222-4222-8222-222222222222'; // Football Stadium

const FRONT_ROWS = ['1', '2', '3'];
const FRONT_ROW_PREMIUM_CENTS = 15000;

// [template, section key, name, price cents, seats available, tags]
const TICKET_TYPES = [
  [ARENA_ID, 'vip', 'VIP', 45000, 40, 'discounted,vip'],
  [ARENA_ID, 'a', 'A', 40000, 120, 'discounted,best seller'],
  [ARENA_ID, 'b', 'B', 30000, 200, 'discounted,best seller'],
  [ARENA_ID, 'c', 'C', 20000, 300, null],
  [STADIUM_ID, 'vip', 'VIP', 40000, 60, 'discounted,vip'],
  [STADIUM_ID, 't.gold', 'T.GOLD', 32500, 150, 'discounted,vip'],
  [STADIUM_ID, 'b.gold', 'B.GOLD', 32500, 150, 'discounted,vip'],
  [STADIUM_ID, 't.bronz', 'T.BRONZ', 30000, 400, 'discounted'],
  [STADIUM_ID, 'b.bronz', 'B.BRONZ', 30000, 400, 'discounted'],
  [STADIUM_ID, 'l.bronz', 'L.BRONZ', 30000, 400, 'discounted'],
  [STADIUM_ID, 'r.bronz', 'R.BRONZ', 30000, 400, 'discounted'],
  [STADIUM_ID, 't.standard', 'T.STANDARD', 20000, 900, 'discounted'],
  [STADIUM_ID, 'b.standard', 'B.STANDARD', 20000, 900, 'discounted'],
] as const;

// The template a published event without a map would use.
const TEMPLATE_OF_EVENT = `
  CASE WHEN e."type" = 'sport' AND e."category" = 'Football'
       THEN '${STADIUM_ID}'::uuid ELSE '${ARENA_ID}'::uuid END
`;

const EVENTS_WITHOUT_MAP = `
  SELECT e."id" AS "eventId", e."venueId", ${TEMPLATE_OF_EVENT} AS "templateId"
    FROM "CatalogEvent" e
   WHERE e."seatMapId" IS NULL
     AND e."status" = 'published'
     AND e."deletedAt" IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM "CatalogTicketType" tt
        WHERE tt."eventId" = e."id"
          AND NOT EXISTS (
            SELECT 1 FROM "CatalogSeatMap" t
              CROSS JOIN jsonb_array_elements(t."layout"->'sections') AS section
             WHERE t."id" = ${TEMPLATE_OF_EVENT}
               AND section->>'key' = tt."sectionKey"
          )
     )
`;

const COPY_ID = (venue: string, template: string) =>
  `md5('seat-map:' || ${venue} || ':' || ${template})::uuid`;

export class Migration1792100000000 implements MigrationInterface {
  name = 'Migration1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "CatalogSeatMap" ("id", "venueId", "name", "layout")
      SELECT ${COPY_ID('n."venueId"', 'n."templateId"')}, n."venueId",
             left(t."name" || ' - ' || v."name", 100), t."layout"
        FROM (SELECT DISTINCT "venueId", "templateId" FROM (${EVENTS_WITHOUT_MAP}) w) n
        JOIN "CatalogSeatMap" t ON t."id" = n."templateId"
        JOIN "CatalogVenue" v ON v."id" = n."venueId"
    `);

    await queryRunner.query(`
      INSERT INTO "CatalogSeat" ("id", "seatMapId", "sectionKey", "row", "number", "x", "y", "perks")
      SELECT gen_random_uuid(), ${COPY_ID('n."venueId"', 'n."templateId"')},
             s."sectionKey", s."row", s."number", s."x", s."y", s."perks"
        FROM (SELECT DISTINCT "venueId", "templateId" FROM (${EVENTS_WITHOUT_MAP}) w) n
        JOIN "CatalogSeat" s ON s."seatMapId" = n."templateId" AND s."deletedAt" IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO "CatalogSeatMapSectionView" ("id", "seatMapId", "sectionKey", "score", "label")
      SELECT gen_random_uuid(), ${COPY_ID('n."venueId"', 'n."templateId"')},
             sv."sectionKey", sv."score", sv."label"
        FROM (SELECT DISTINCT "venueId", "templateId" FROM (${EVENTS_WITHOUT_MAP}) w) n
        JOIN "CatalogSeatMapSectionView" sv
          ON sv."seatMapId" = n."templateId" AND sv."deletedAt" IS NULL
    `);

    // One statement, so each step sees exactly the events the first one moved.
    await queryRunner.query(
      `
      WITH moved AS (
        UPDATE "CatalogEvent" e
           SET "seatMapId" = ${COPY_ID('w."venueId"', 'w."templateId"')}
          FROM (${EVENTS_WITHOUT_MAP}) w
         WHERE e."id" = w."eventId"
        RETURNING e."id" AS "eventId", w."templateId"
      ),
      types AS (
        INSERT INTO "CatalogTicketType"
          ("id", "eventId", "sectionKey", "name", "priceCents", "serviceFeeCents", "taxCents",
           "currency", "seatsAvailable", "maxPerOrder", "tags")
        SELECT gen_random_uuid(), m."eventId", v."sectionKey", v."name", v."priceCents",
               round(v."priceCents" * 0.15), round(v."priceCents" * 0.08),
               'USD', v."seatsAvailable", 8, v."tags"
          FROM moved m
          JOIN jsonb_to_recordset($1::jsonb) AS v(
                 "templateId" uuid, "sectionKey" text, "name" text, "priceCents" integer,
                 "seatsAvailable" integer, "tags" text)
            ON v."templateId" = m."templateId"
         WHERE NOT EXISTS (
           SELECT 1 FROM "CatalogTicketType" tt WHERE tt."eventId" = m."eventId"
         )
        RETURNING "id"
      )
      INSERT INTO "CatalogTicketTypeRowPrice" ("id", "ticketTypeId", "row", "premiumCents")
      SELECT gen_random_uuid(), t."id", r."row", $3::integer
        FROM (
          SELECT "id" FROM types
          UNION
          SELECT tt."id" FROM "CatalogTicketType" tt
            JOIN moved m ON m."eventId" = tt."eventId"
           WHERE NOT EXISTS (
             SELECT 1 FROM "CatalogTicketTypeRowPrice" rp WHERE rp."ticketTypeId" = tt."id"
           )
        ) t
        CROSS JOIN unnest($2::text[]) AS r("row")
    `,
      [
        JSON.stringify(
          TICKET_TYPES.map(
            ([
              templateId,
              sectionKey,
              name,
              priceCents,
              seatsAvailable,
              tags,
            ]) => ({
              templateId,
              sectionKey,
              name,
              priceCents,
              seatsAvailable,
              tags,
            }),
          ),
        ),
        FRONT_ROWS,
        FRONT_ROW_PREMIUM_CENTS,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const copies = `
      SELECT m."id" FROM "CatalogSeatMap" m
        CROSS JOIN unnest(ARRAY['${ARENA_ID}', '${STADIUM_ID}']::uuid[]) AS t("id")
       WHERE m."id" = ${COPY_ID('m."venueId"', 't."id"')}
    `;

    // Ticket types stay: the ones up() made look like the ones events already
    // had, so they cannot be told apart. Without a map they only hide the
    // seat page, and up() keeps them if it runs again.
    await queryRunner.query(
      `
      DELETE FROM "CatalogTicketTypeRowPrice" rp
       USING "CatalogTicketType" tt, "CatalogEvent" e
       WHERE tt."id" = rp."ticketTypeId"
         AND e."id" = tt."eventId"
         AND e."seatMapId" IN (${copies})
         AND rp."row" = ANY($1::text[])
         AND rp."premiumCents" = $2
    `,
      [FRONT_ROWS, FRONT_ROW_PREMIUM_CENTS],
    );
    await queryRunner.query(`
      UPDATE "CatalogEvent" SET "seatMapId" = NULL WHERE "seatMapId" IN (${copies})
    `);
    await queryRunner.query(
      `DELETE FROM "CatalogSeatMap" WHERE "id" IN (${copies})`,
    );
  }
}
