import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791941141321 implements MigrationInterface {
  name = 'Migration1791941141321';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "CatalogSeatMapSectionView" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sectionKey" character varying(50) NOT NULL, "score" numeric(2,1) NOT NULL, "label" character varying(30) NOT NULL, "seatMapId" uuid NOT NULL, CONSTRAINT "UQ_c37f1982706967156965d3892b1" UNIQUE ("seatMapId", "sectionKey"), CONSTRAINT "CHK_1a61682736e18b1e268663dd15" CHECK (btrim("label") <> ''), CONSTRAINT "CHK_fe079b115d6b491de14b8a9a04" CHECK ("score" >= 0 AND "score" <= 5), CONSTRAINT "PK_b3d2fb434d1246b5d68e2a5adaa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMapSectionView" ADD CONSTRAINT "FK_15a9a1bf537b3b645022e4043e1" FOREIGN KEY ("seatMapId") REFERENCES "CatalogSeatMap"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeatMapSectionView" DROP CONSTRAINT "FK_15a9a1bf537b3b645022e4043e1"`,
    );
    await queryRunner.query(`DROP TABLE "CatalogSeatMapSectionView"`);
  }
}
