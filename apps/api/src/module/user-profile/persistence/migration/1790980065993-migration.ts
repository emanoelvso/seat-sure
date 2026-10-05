import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790980065993 implements MigrationInterface {
  name = 'Migration1790980065993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "UserProfileUser" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "firstName" character varying(50) NOT NULL, "lastName" character varying(50) NOT NULL, "avatarUrl" character varying, CONSTRAINT "PK_b57583b735f0a2c3aa0a34d9787" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "UserProfileUser"`);
  }
}
