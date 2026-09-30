import { MigrationInterface, QueryRunner } from 'typeorm';

// Points each event at its CatalogVenue instead of naming it in free text.
// Events are matched by their old venue name and city. "Engenhão" is the
// nickname of Estádio Nilton Santos, which Migration1790697184776 seeds once
// under its official name. An event that matches no venue aborts the
// migration, and TypeORM rolls it back.
export class Migration1790713611256 implements MigrationInterface {
  name = 'Migration1790713611256';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "CatalogEvent" ADD "venueId" uuid`);
    await queryRunner.query(`
      UPDATE "CatalogEvent" e
         SET "venueId" = v."id"
        FROM "CatalogVenue" v
       WHERE v."name" = (CASE e."venue" WHEN 'Engenhão' THEN 'Estádio Nilton Santos' ELSE e."venue" END)
         AND v."city" = e."city"
    `);

    const unmatched: { venue: string; city: string }[] =
      await queryRunner.query(
        `SELECT DISTINCT "venue", "city" FROM "CatalogEvent" WHERE "venueId" IS NULL ORDER BY "venue", "city"`,
      );
    if (unmatched.length > 0) {
      const list = unmatched
        .map(({ venue, city }) => `${venue} (${city})`)
        .join(', ');
      throw new Error(`Events reference unknown venues: ${list}`);
    }

    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ALTER COLUMN "venueId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD CONSTRAINT "FK_e1dd6fa9c82a13b7d5a27d507a5" FOREIGN KEY ("venueId") REFERENCES "CatalogVenue"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "CatalogEvent" DROP COLUMN "venue"`);
    await queryRunner.query(`ALTER TABLE "CatalogEvent" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "CatalogEvent" DROP COLUMN "country"`);
  }

  // The Engenhão event comes back as "Estádio Nilton Santos", its venue's name.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD "venue" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD "city" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD "country" character varying`,
    );
    await queryRunner.query(`
      UPDATE "CatalogEvent" e
         SET "venue" = v."name", "city" = v."city", "country" = v."country"
        FROM "CatalogVenue" v
       WHERE v."id" = e."venueId"
    `);
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ALTER COLUMN "venue" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ALTER COLUMN "city" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ALTER COLUMN "country" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" DROP CONSTRAINT "FK_e1dd6fa9c82a13b7d5a27d507a5"`,
    );
    await queryRunner.query(`ALTER TABLE "CatalogEvent" DROP COLUMN "venueId"`);
  }
}
