import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790980305363 implements MigrationInterface {
  name = 'Migration1790980305363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentityUser" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "email" character varying(254) NOT NULL, "passwordHash" character varying(60) NOT NULL, "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "lastLoginAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_4e491063b5b49343838163273d9" UNIQUE ("email"), CONSTRAINT "PK_20387a6056555215bc2e2e91844" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "IdentityUser"`);
  }
}
