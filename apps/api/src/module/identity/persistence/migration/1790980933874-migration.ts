import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790980933874 implements MigrationInterface {
  name = 'Migration1790980933874';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentityVerificationCode" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "purpose" character varying(20) NOT NULL, "codeHash" character varying(60) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "failedAttempts" integer NOT NULL DEFAULT '0', "consumedAt" TIMESTAMP WITH TIME ZONE, "invalidatedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_183288ff89534a56bccd5e56ecc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36036f8a9d6beb557f300a5ccf" ON "IdentityVerificationCode" ("userId", "purpose", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36036f8a9d6beb557f300a5ccf"`,
    );
    await queryRunner.query(`DROP TABLE "IdentityVerificationCode"`);
  }
}
