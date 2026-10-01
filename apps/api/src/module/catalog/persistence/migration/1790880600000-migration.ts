import { MigrationInterface, QueryRunner } from 'typeorm';

// Seeds the frame 12 seat chart (150 seats) into every section of the two
// seeded seat maps. Positions are in the section's own chart units (Figma px)
// and are generated here, not imported, so this migration never changes with
// app code.
const SEAT_MAP_IDS = [
  '11111111-1111-4111-8111-111111111111', // Concentric Arena, 4 sections
  '22222222-2222-4222-8222-222222222222', // Football Stadium, 9 sections
];

type ChartSeat = { row: string; number: string; x: number; y: number };

const pad = (value: number) => String(value).padStart(2, '0');

const chartSeats = (): ChartSeat[] => {
  const seats: ChartSeat[] = [];

  // Rows 1-4: arcs of 9, 11, 13 and 13 seats, centered on x = 391.
  [9, 11, 13, 13].forEach((n, index) => {
    const row = index + 1;
    for (let i = 1; i <= n; i++) {
      seats.push({
        row: String(row),
        number: pad(i),
        x: 391 + (i - (n + 1) / 2) * 54,
        y: 40 + (row - 1) * 43 + 8 * Math.min(i - 1, n - i),
      });
    }
  });

  // Rows 5-12: 13 seats in blocks of 4, 5 and 4, with the middle block lower.
  for (let row = 5; row <= 12; row++) {
    for (let c = 1; c <= 13; c++) {
      const offset = c <= 4 ? 8 * (c - 1) : c <= 9 ? 32 : 8 * (13 - c);
      seats.push({
        row: String(row),
        number: pad(c),
        x: 40 + 54 * (c - 1) + (c > 4 ? 27 : 0) + (c > 9 ? 27 : 0),
        y: 241 + (row - 5) * 48 + offset,
      });
    }
  }

  return seats;
};

export class Migration1790880600000 implements MigrationInterface {
  name = 'Migration1790880600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "CatalogSeat" ("id", "seatMapId", "sectionKey", "row", "number", "x", "y")
      SELECT gen_random_uuid(), m."id", section->>'key', c."row", c."number", c."x", c."y"
      FROM "CatalogSeatMap" m
      CROSS JOIN LATERAL jsonb_array_elements(m."layout"->'sections') AS section
      CROSS JOIN jsonb_to_recordset($2::jsonb) AS c("row" text, "number" text, "x" double precision, "y" double precision)
      WHERE m."id" = ANY($1::uuid[])
    `,
      [SEAT_MAP_IDS, JSON.stringify(chartSeats())],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "CatalogSeat" WHERE "seatMapId" = ANY($1::uuid[])`,
      [SEAT_MAP_IDS],
    );
  }
}
