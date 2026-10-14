import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791940872270 implements MigrationInterface {
  name = 'Migration1791940872270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "CatalogTicketTypeRowPrice" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "row" character varying(10) NOT NULL, "premiumCents" integer NOT NULL, "ticketTypeId" uuid NOT NULL, CONSTRAINT "UQ_5cd75eafec7f2b9b3058bbfd7fa" UNIQUE ("ticketTypeId", "row"), CONSTRAINT "CHK_9fc5a730591029bbd78fbcc173" CHECK ("premiumCents" >= 0), CONSTRAINT "CHK_bdd6c1edb3790d59ebfe87108a" CHECK (btrim("row") <> ''), CONSTRAINT "PK_4d42c6791d4dd4611bf030acac8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketTypeRowPrice" ADD CONSTRAINT "FK_0a580497f689f88922f8fa22cae" FOREIGN KEY ("ticketTypeId") REFERENCES "CatalogTicketType"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogTicketTypeRowPrice" DROP CONSTRAINT "FK_0a580497f689f88922f8fa22cae"`,
    );
    await queryRunner.query(`DROP TABLE "CatalogTicketTypeRowPrice"`);
  }
}
