import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791307834270 implements MigrationInterface {
  name = 'Migration1791307834270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "state" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "city" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "birthDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "phoneCountryCode" character varying(4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "phoneNumber" character varying(14)`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "zipCode" character varying(10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "zipCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "phoneNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "phoneCountryCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "birthDate"`,
    );
    await queryRunner.query(`ALTER TABLE "UserProfileUser" DROP COLUMN "city"`);
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "state"`,
    );
  }
}
