import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791941048072 implements MigrationInterface {
  name = 'Migration1791941048072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD "perks" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "CHK_5cb9a694cfd8cc3d0bac87ec34" CHECK ("perks" <@ ARRAY['AISLE', 'EXTRA_LEGROOM', 'ACCESSIBLE']::text[])`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "CHK_5cb9a694cfd8cc3d0bac87ec34"`,
    );
    await queryRunner.query(`ALTER TABLE "CatalogSeat" DROP COLUMN "perks"`);
  }
}
