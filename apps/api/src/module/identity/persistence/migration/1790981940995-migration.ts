import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790981940995 implements MigrationInterface {
  name = 'Migration1790981940995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentityLoginThrottle" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "email" character varying(254) NOT NULL, "failedCount" integer NOT NULL DEFAULT '0', "windowStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lockedUntil" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_fec3bc2564fc4fbad6726d9ebe6" UNIQUE ("email"), CONSTRAINT "PK_466017fccf7f4b6f61c9af9ebd0" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "IdentityLoginThrottle"`);
  }
}
