import { MigrationInterface, QueryRunner } from 'typeorm';

// Seeds the demo data the seat page filters need on the two seeded seat maps
// (1790550000000, 1790600000001): dearer front rows, seat perks and a view
// rating for every section. down() removes exactly what up() adds.
const SEAT_MAP_IDS = [
  '11111111-1111-4111-8111-111111111111', // Concentric Arena
  '22222222-2222-4222-8222-222222222222', // Football Stadium
];

// Every ticket type on these maps costs this much more in rows 1-3.
const FRONT_ROWS = ['1', '2', '3'];
const FRONT_ROW_PREMIUM_CENTS = 15000;

// [seat map id, section key, score, label]
const SECTION_VIEWS = [
  [SEAT_MAP_IDS[0], 'vip', 4.7, 'Clear View'],
  [SEAT_MAP_IDS[0], 'a', 4.2, 'Good Angle'],
  [SEAT_MAP_IDS[0], 'b', 3.8, 'Side View'],
  [SEAT_MAP_IDS[0], 'c', 3.2, 'Distant View'],
  [SEAT_MAP_IDS[1], 'vip', 4.6, 'Pitch-side View'],
  [SEAT_MAP_IDS[1], 't.gold', 4.4, 'Central View'],
  [SEAT_MAP_IDS[1], 'b.gold', 4.3, 'Central View'],
  [SEAT_MAP_IDS[1], 'l.bronz', 4.0, 'Sideline View'],
  [SEAT_MAP_IDS[1], 'r.bronz', 3.9, 'Sideline View'],
  [SEAT_MAP_IDS[1], 't.bronz', 3.9, 'Corner View'],
  [SEAT_MAP_IDS[1], 't.standard', 3.6, 'Elevated View'],
  [SEAT_MAP_IDS[1], 'b.bronz', 3.5, 'Corner View'],
  [SEAT_MAP_IDS[1], 'b.standard', 3.3, 'Distant View'],
] as const;

export class Migration1791941200000 implements MigrationInterface {
  name = 'Migration1791941200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "CatalogTicketTypeRowPrice" ("id", "ticketTypeId", "row", "premiumCents")
      SELECT gen_random_uuid(), tt."id", r."row", $3::integer
      FROM "CatalogTicketType" tt
      JOIN "CatalogEvent" e ON e."id" = tt."eventId"
      CROSS JOIN unnest($2::text[]) AS r("row")
      WHERE e."seatMapId" = ANY($1::uuid[])
    `,
      [SEAT_MAP_IDS, FRONT_ROWS, FRONT_ROW_PREMIUM_CENTS],
    );

    // The first and last seat of each row are on the aisle, row 5 has extra
    // legroom and seats 01-02 of row 12 are accessible.
    await queryRunner.query(
      `
      UPDATE "CatalogSeat" s
      SET "perks" = ARRAY(
        SELECT perk.code
        FROM (VALUES ('AISLE', 1), ('EXTRA_LEGROOM', 2), ('ACCESSIBLE', 3)) AS perk(code, position)
        WHERE (perk.code = 'AISLE' AND s."number" IN (
                SELECT MIN(o."number") FROM "CatalogSeat" o
                 WHERE o."seatMapId" = s."seatMapId" AND o."sectionKey" = s."sectionKey" AND o."row" = s."row"
                UNION
                SELECT MAX(o."number") FROM "CatalogSeat" o
                 WHERE o."seatMapId" = s."seatMapId" AND o."sectionKey" = s."sectionKey" AND o."row" = s."row"))
           OR (perk.code = 'EXTRA_LEGROOM' AND s."row" = '5')
           OR (perk.code = 'ACCESSIBLE' AND s."row" = '12' AND s."number" IN ('01', '02'))
        ORDER BY perk.position
      )
      WHERE s."seatMapId" = ANY($1::uuid[])
    `,
      [SEAT_MAP_IDS],
    );

    for (const [seatMapId, sectionKey, score, label] of SECTION_VIEWS) {
      await queryRunner.query(
        `
        INSERT INTO "CatalogSeatMapSectionView" ("id", "seatMapId", "sectionKey", "score", "label")
        SELECT gen_random_uuid(), m."id", $2::text, $3::numeric, $4::text
        FROM "CatalogSeatMap" m
        WHERE m."id" = $1
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(m."layout"->'sections') AS section
             WHERE section->>'key' = $2::text)
      `,
        [seatMapId, sectionKey, score, label],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "CatalogSeatMapSectionView" WHERE "seatMapId" = ANY($1::uuid[])`,
      [SEAT_MAP_IDS],
    );
    await queryRunner.query(
      `UPDATE "CatalogSeat" SET "perks" = '{}' WHERE "seatMapId" = ANY($1::uuid[])`,
      [SEAT_MAP_IDS],
    );
    await queryRunner.query(
      `
      DELETE FROM "CatalogTicketTypeRowPrice" rp
      USING "CatalogTicketType" tt, "CatalogEvent" e
      WHERE tt."id" = rp."ticketTypeId"
        AND e."id" = tt."eventId"
        AND e."seatMapId" = ANY($1::uuid[])
        AND rp."row" = ANY($2::text[])
        AND rp."premiumCents" = $3
    `,
      [SEAT_MAP_IDS, FRONT_ROWS, FRONT_ROW_PREMIUM_CENTS],
    );
  }
}
