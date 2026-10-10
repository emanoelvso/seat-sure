import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791409118376 implements MigrationInterface {
  name = 'Migration1791409118376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "NotificationsNotification" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "type" character varying(40) NOT NULL, "channel" character varying(20) NOT NULL, "sourceId" character varying(64) NOT NULL, "payload" jsonb NOT NULL, "readAt" TIMESTAMP, CONSTRAINT "UQ_c4d2605f77c01b58ed6b7217631" UNIQUE ("userId", "type", "sourceId"), CONSTRAINT "PK_30bde43a54ddc205069bb993faa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2731cde1e7f3f3b4799de89fd1" ON "NotificationsNotification"  ("userId", "createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2731cde1e7f3f3b4799de89fd1"`,
    );
    await queryRunner.query(`DROP TABLE "NotificationsNotification"`);
  }
}
