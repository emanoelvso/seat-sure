import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791148166278 implements MigrationInterface {
  name = 'Migration1791148166278';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."BillingPayment_status_enum" AS ENUM('succeeded', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "BillingPayment" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "orderId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerPaymentId" character varying, "amountCents" integer NOT NULL, "currency" character(3) NOT NULL, "status" "public"."BillingPayment_status_enum" NOT NULL, "cardBrand" character varying(20) NOT NULL, "cardLast4" character(4) NOT NULL, "failureReason" character varying(50), "refundedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_c70bd319d264ceada42662c351" CHECK ("amountCents" >= 0), CONSTRAINT "PK_8a0d9a208e2a4a286e63673162f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "BillingPayment"`);
    await queryRunner.query(`DROP TYPE "public"."BillingPayment_status_enum"`);
  }
}
