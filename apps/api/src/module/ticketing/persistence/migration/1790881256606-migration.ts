import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790881256606 implements MigrationInterface {
  name = 'Migration1790881256606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "TicketingSeatHold" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "eventId" uuid NOT NULL, "seatId" uuid NOT NULL, "userId" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_9494f7f1b8d100c785454a1eb5b" UNIQUE ("eventId", "seatId"), CONSTRAINT "PK_9b288dc4c98eacdfdf8fb046cab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."TicketingTicket_status_enum" AS ENUM('issued', 'used', 'cancelled', 'refunded', 'transferred')`,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketingTicket" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "eventId" uuid NOT NULL, "seatId" uuid, "userId" uuid NOT NULL, "code" character varying(32) NOT NULL, "status" "public"."TicketingTicket_status_enum" NOT NULL, CONSTRAINT "UQ_5cf617bc9b0f75c93818a3d1617" UNIQUE ("code"), CONSTRAINT "PK_d02454d6f4c8b60168a257dbd49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9ceb63431534ddcbec98a87032" ON "TicketingTicket"  ("eventId", "seatId") WHERE "status" IN ('issued', 'used', 'transferred')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9ceb63431534ddcbec98a87032"`,
    );
    await queryRunner.query(`DROP TABLE "TicketingTicket"`);
    await queryRunner.query(`DROP TYPE "public"."TicketingTicket_status_enum"`);
    await queryRunner.query(`DROP TABLE "TicketingSeatHold"`);
  }
}
