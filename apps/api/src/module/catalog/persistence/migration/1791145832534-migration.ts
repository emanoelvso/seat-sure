import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791145832534 implements MigrationInterface {
  name = 'Migration1791145832534';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" ADD "serviceFeeCents" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" ADD "taxCents" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" ADD CONSTRAINT "CHK_2b67eb779eccca74792b9d3aee" CHECK ("taxCents" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" ADD CONSTRAINT "CHK_ed90d40fb1dd1dc9397e83bf76" CHECK ("serviceFeeCents" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" DROP CONSTRAINT "CHK_ed90d40fb1dd1dc9397e83bf76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" DROP CONSTRAINT "CHK_2b67eb779eccca74792b9d3aee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" DROP COLUMN "taxCents"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketType" DROP COLUMN "serviceFeeCents"`,
    );
  }
}
