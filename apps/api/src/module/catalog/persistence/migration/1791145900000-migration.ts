import { MigrationInterface, QueryRunner } from 'typeorm';

// Data migration (AD-012): backfills serviceFeeCents (15%) and taxCents (8%)
// of priceCents for every existing ticket type. Checked by
// .specs/features/buy-ticket-checkout/checks/ticket-type-fees.sql.
export class Migration1791145900000 implements MigrationInterface {
  name = 'Migration1791145900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "CatalogTicketType"
      SET "serviceFeeCents" = round("priceCents" * 0.15),
          "taxCents" = round("priceCents" * 0.08)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "CatalogTicketType"
      SET "serviceFeeCents" = 0,
          "taxCents" = 0
    `);
  }
}
