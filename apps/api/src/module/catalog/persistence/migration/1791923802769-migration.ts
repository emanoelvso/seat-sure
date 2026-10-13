import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791923802769 implements MigrationInterface {
  name = 'Migration1791923802769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" DROP CONSTRAINT "FK_a8e1c28ac3f77c86a7f7059d59d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" DROP CONSTRAINT "FK_adbf108db07f336bd221b37b818"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" ALTER COLUMN "venueId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" ADD CONSTRAINT "UQ_b765f5cf25d82caf409adf6276b" UNIQUE ("id", "venueId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" ADD CONSTRAINT "FK_adbf108db07f336bd221b37b818" FOREIGN KEY ("venueId") REFERENCES "CatalogVenue"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD CONSTRAINT "FK_beed187020460d1eb83e3f63e54" FOREIGN KEY ("seatMapId", "venueId") REFERENCES "CatalogSeatMap"("id","venueId") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" DROP CONSTRAINT "FK_beed187020460d1eb83e3f63e54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" DROP CONSTRAINT "FK_adbf108db07f336bd221b37b818"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" DROP CONSTRAINT "UQ_b765f5cf25d82caf409adf6276b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" ALTER COLUMN "venueId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMap" ADD CONSTRAINT "FK_adbf108db07f336bd221b37b818" FOREIGN KEY ("venueId") REFERENCES "CatalogVenue"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogEvent" ADD CONSTRAINT "FK_a8e1c28ac3f77c86a7f7059d59d" FOREIGN KEY ("seatMapId") REFERENCES "CatalogSeatMap"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
