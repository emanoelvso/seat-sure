import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790880556574 implements MigrationInterface {
  name = 'Migration1790880556574';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "CatalogSeat" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sectionKey" character varying(50) NOT NULL, "row" character varying(10) NOT NULL, "number" character varying(10) NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "seatMapId" uuid NOT NULL, CONSTRAINT "UQ_3581ce0ac5b7be417de7939cc1b" UNIQUE ("seatMapId", "sectionKey", "row", "number"), CONSTRAINT "PK_ce97cb30edadd42aa85c7e9dc66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66409ddde16999beef84e3400f" ON "CatalogSeat"  ("seatMapId", "sectionKey") `,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "FK_66d80a1534cc0d8560aca86953b" FOREIGN KEY ("seatMapId") REFERENCES "CatalogSeatMap"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "FK_66d80a1534cc0d8560aca86953b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66409ddde16999beef84e3400f"`,
    );
    await queryRunner.query(`DROP TABLE "CatalogSeat"`);
  }
}
