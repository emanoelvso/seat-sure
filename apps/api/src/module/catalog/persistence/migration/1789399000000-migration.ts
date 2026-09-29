import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789399000000 implements MigrationInterface {
  name = 'Migration1789399000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Event" ADD "description" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ADD "city" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ADD "country" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ADD "price" float NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "price"`);
    await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "country"`);
    await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "description"`);
  }
}
