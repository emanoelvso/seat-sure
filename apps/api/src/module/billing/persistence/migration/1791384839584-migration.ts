import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791384839584 implements MigrationInterface {
  name = 'Migration1791384839584';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "BillingPaymentCard" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerToken" character varying NOT NULL, "fingerprint" character(64) NOT NULL, "brand" character varying(20) NOT NULL, "last4" character(4) NOT NULL, "expMonth" smallint NOT NULL, "expYear" smallint NOT NULL, "holder" character varying(50) NOT NULL, "isDefault" boolean NOT NULL, CONSTRAINT "UQ_85ae205939f686b053369db7d03" UNIQUE ("userId", "fingerprint"), CONSTRAINT "PK_f574865e08360b1e6e237d27e5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cad8eb7723591ca43f2a46da05" ON "BillingPaymentCard"  ("userId") WHERE "isDefault"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cad8eb7723591ca43f2a46da05"`,
    );
    await queryRunner.query(`DROP TABLE "BillingPaymentCard"`);
  }
}
