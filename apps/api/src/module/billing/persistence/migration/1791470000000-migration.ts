import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791470000000 implements MigrationInterface {
  name = 'Migration1791470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "BillingCardThrottle" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "failedCount" integer NOT NULL DEFAULT '0', "windowStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lockedUntil" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_billing_card_throttle_user" UNIQUE ("userId"), CONSTRAINT "PK_billing_card_throttle" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "BillingCardThrottle"`);
  }
}
