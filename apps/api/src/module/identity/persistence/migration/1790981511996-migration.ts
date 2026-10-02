import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790981511996 implements MigrationInterface {
  name = 'Migration1790981511996';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentitySession" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "refreshTokenHash" character(64) NOT NULL, "previousRefreshTokenHash" character(64), "rotatedAt" TIMESTAMP WITH TIME ZONE, "persistent" boolean NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_836c98e93f1a571b880caa1b0b2" UNIQUE ("refreshTokenHash"), CONSTRAINT "PK_a51538e2e4d3358d3e1b504bc49" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "IdentitySession"`);
  }
}
