import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790982588140 implements MigrationInterface {
  name = 'Migration1790982588140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentityPasswordResetGrant" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "tokenHash" character(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_872f6eb00a8c5b3fdebc67b13ae" UNIQUE ("tokenHash"), CONSTRAINT "PK_50eb9941245dfb6ccc5a78ae065" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "IdentityPasswordResetGrant"`);
  }
}
