import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1792421265286 implements MigrationInterface {
  name = 'Migration1792421265286';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."TicketingOrder_status_enum" ADD VALUE 'requires_action'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "TicketingOrder" SET "status" = 'pending' WHERE "status" = 'requires_action'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_184e944ea7e39a2618a270b053"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."TicketingOrder_status_enum_old" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingOrder" ALTER COLUMN "status" TYPE "public"."TicketingOrder_status_enum_old" USING "status"::"text"::"public"."TicketingOrder_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."TicketingOrder_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."TicketingOrder_status_enum_old" RENAME TO "TicketingOrder_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_184e944ea7e39a2618a270b053" ON "TicketingOrder" USING btree ("userId", "eventId", "status") `,
    );
  }
}
