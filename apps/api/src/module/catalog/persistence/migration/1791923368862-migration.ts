import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791923368862 implements MigrationInterface {
  name = 'Migration1791923368862';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "CHK_e560dde6de0047ada3058d1a36" CHECK ("x" >= 0 AND "y" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "CHK_f1c679bc12161de8b9252cefe3" CHECK (btrim("number") <> '')`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "CHK_b3f8ab5c489dfd72d6cc212bc2" CHECK (btrim("row") <> '')`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" ADD CONSTRAINT "CHK_a9628f529c1920d2fb5ccbbbdb" CHECK (btrim("sectionKey") <> '')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "CHK_a9628f529c1920d2fb5ccbbbdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "CHK_b3f8ab5c489dfd72d6cc212bc2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "CHK_f1c679bc12161de8b9252cefe3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CatalogSeat" DROP CONSTRAINT "CHK_e560dde6de0047ada3058d1a36"`,
    );
  }
}
