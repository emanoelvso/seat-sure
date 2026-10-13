import { MigrationInterface, QueryRunner } from 'typeorm';

// Gives each seeded seat map the venue it belongs to, so the next migration
// can require a venue on every map and tie an event's map to its venue.
// Concentric Arena (1790550000000) goes to The Colosseum at Caesars Palace and
// Football Stadium (1790600000001) to Maracanã (venues from 1790697184776).
// Events at any other venue lose their seat map; seats and ticket types stay.
// Any other map without a venue aborts the migration, and TypeORM rolls it
// back.
const SEEDED_OWNERS = [
  {
    seatMapId: '11111111-1111-4111-8111-111111111111', // Concentric Arena
    venueId: 'a0000000-0000-4000-8000-000000000023', // Caesars Palace
  },
  {
    seatMapId: '22222222-2222-4222-8222-222222222222', // Football Stadium
    venueId: 'a0000000-0000-4000-8000-000000000013', // Maracanã
  },
];

export class Migration1791923400000 implements MigrationInterface {
  name = 'Migration1791923400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const unowned: { id: string; name: string }[] = await queryRunner.query(
      `SELECT "id", "name" FROM "CatalogSeatMap"
        WHERE "venueId" IS NULL AND "id" <> ALL($1::uuid[])
        ORDER BY "name", "id"`,
      [SEEDED_OWNERS.map(({ seatMapId }) => seatMapId)],
    );
    if (unowned.length > 0) {
      const list = unowned.map(({ id, name }) => `${name} (${id})`).join(', ');
      throw new Error(`Seat maps have no venue: ${list}`);
    }

    for (const { seatMapId, venueId } of SEEDED_OWNERS) {
      await queryRunner.query(
        `UPDATE "CatalogSeatMap" SET "venueId" = $2
          WHERE "id" = $1 AND "venueId" IS NULL`,
        [seatMapId, venueId],
      );
    }

    await queryRunner.query(`
      UPDATE "CatalogEvent" e
         SET "seatMapId" = NULL
        FROM "CatalogSeatMap" m
       WHERE m."id" = e."seatMapId"
         AND m."venueId" <> e."venueId"
    `);
  }

  // Restores the seed links: published concerts back on Concentric Arena and
  // published football on Football Stadium (1790550000000, 1790600000001).
  public async down(queryRunner: QueryRunner): Promise<void> {
    const [arena, stadium] = SEEDED_OWNERS.map(({ seatMapId }) => seatMapId);

    await queryRunner.query(
      `UPDATE "CatalogEvent" SET "seatMapId" = $1
        WHERE "seatMapId" IS NULL AND "type" = 'concert' AND "status" = 'published'
          AND EXISTS (SELECT 1 FROM "CatalogSeatMap" WHERE "id" = $1)`,
      [arena],
    );
    await queryRunner.query(
      `UPDATE "CatalogEvent" SET "seatMapId" = $1
        WHERE "seatMapId" IS NULL AND "type" = 'sport' AND "category" = 'Football'
          AND "status" = 'published'
          AND EXISTS (SELECT 1 FROM "CatalogSeatMap" WHERE "id" = $1)`,
      [stadium],
    );
    await queryRunner.query(
      `UPDATE "CatalogSeatMap" SET "venueId" = NULL WHERE "id" = ANY($1::uuid[])`,
      [[arena, stadium]],
    );
  }
}
