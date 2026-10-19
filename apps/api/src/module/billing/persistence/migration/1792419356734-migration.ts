import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1792419356734 implements MigrationInterface {
  name = 'Migration1792419356734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "BillingCustomer" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerCustomerId" character varying NOT NULL, CONSTRAINT "UQ_c1f231050d493903b98be4e2337" UNIQUE ("userId", "provider"), CONSTRAINT "PK_9b6ef2e86e918bd001f63ca606c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "BillingPendingCard" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "paymentId" uuid NOT NULL, "userId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerToken" character varying NOT NULL, "customerId" character varying, "fingerprint" character(64) NOT NULL, "brand" character varying(20) NOT NULL, "last4" character(4) NOT NULL, "expMonth" smallint NOT NULL, "expYear" smallint NOT NULL, "holder" character varying(50) NOT NULL, CONSTRAINT "UQ_9c0733387895100ded20d228bfd" UNIQUE ("paymentId"), CONSTRAINT "PK_fd2d22382ef6a1e87610d0fd616" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."BillingSimulatedPayment_status_enum" AS ENUM('requires_action', 'authorized', 'authentication_failed', 'captured', 'cancelled', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "BillingSimulatedPayment" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "idempotencyKey" character varying(120) NOT NULL, "status" "public"."BillingSimulatedPayment_status_enum" NOT NULL, "clientSecret" character varying, "amountCents" integer NOT NULL, "currency" character(3) NOT NULL, CONSTRAINT "UQ_d31eb2c45412b5e6820eab1da81" UNIQUE ("idempotencyKey"), CONSTRAINT "UQ_b58990a9a35ef77144de44d0c32" UNIQUE ("clientSecret"), CONSTRAINT "PK_07d3e1ec29d28d7afded8e9e37e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "BillingPaymentCard" ADD "customerId" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."BillingPayment_status_enum" ADD VALUE 'requires_action'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."BillingPayment_status_enum" ADD VALUE 'authorized'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."BillingPayment_status_enum" ADD VALUE 'cancelled'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."BillingPayment_status_enum_old" AS ENUM('succeeded', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `ALTER TABLE "BillingPayment" ALTER COLUMN "status" TYPE "public"."BillingPayment_status_enum_old" USING "status"::"text"::"public"."BillingPayment_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."BillingPayment_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."BillingPayment_status_enum_old" RENAME TO "BillingPayment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "BillingPaymentCard" DROP COLUMN "customerId"`,
    );
    await queryRunner.query(`DROP TABLE "BillingSimulatedPayment"`);
    await queryRunner.query(
      `DROP TYPE "public"."BillingSimulatedPayment_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "BillingPendingCard"`);
    await queryRunner.query(`DROP TABLE "BillingCustomer"`);
  }
}
