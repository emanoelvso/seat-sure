import { MigrationInterface, QueryRunner } from 'typeorm';

// The seeded events carry fixed dates, so they age: the ticket page only
// opens upcoming events, and one that has started answers "Event not found".
// Moves every published event that has already started forward by whole
// 18-week blocks (126 days, so the weekday and the time of day stay), to the
// first slot at least a week from now. Events that have not started are left
// alone. down() cannot know the old dates, so it changes nothing.
const BLOCK_DAYS = 126;
const LEAD_DAYS = 7;

export class Migration1792200000000 implements MigrationInterface {
  name = 'Migration1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE "CatalogEvent" e
         SET "date" = e."date" + s."shift",
             "startAt" = e."startAt" + s."shift",
             "endsAt" = e."endsAt" + s."shift",
             "doorsOpen" = e."doorsOpen" + s."shift"
        FROM (
          SELECT "id",
                 make_interval(days => $1::int * ceil(
                   extract(epoch FROM (now() + make_interval(days => $2::int) - "startAt"))
                   / (86400 * $1::int))::int) AS "shift"
            FROM "CatalogEvent"
           WHERE "status" = 'published' AND "deletedAt" IS NULL AND "startAt" < now()
        ) s
       WHERE e."id" = s."id"
    `,
      [BLOCK_DAYS, LEAD_DAYS],
    );
  }

  public async down(): Promise<void> {
    // The dates before the refresh are not kept.
  }
}
