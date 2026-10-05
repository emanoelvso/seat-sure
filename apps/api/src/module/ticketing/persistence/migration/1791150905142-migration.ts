import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791150905142 implements MigrationInterface {
  name = 'Migration1791150905142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."TicketingOrder_status_enum" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketingOrder" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "eventId" uuid NOT NULL, "eventName" character varying(100) NOT NULL, "eventStartAt" TIMESTAMP WITH TIME ZONE NOT NULL, "eventCoverImage" character varying NOT NULL, "eventVenue" character varying(100) NOT NULL, "eventCity" character varying(100) NOT NULL, "eventCountry" character varying(15) NOT NULL, "ticketTypeId" uuid NOT NULL, "ticketTypeName" character varying(100) NOT NULL, "currency" character(3) NOT NULL, "status" "public"."TicketingOrder_status_enum" NOT NULL, "subtotalCents" integer NOT NULL, "serviceFeeCents" integer NOT NULL, "taxCents" integer NOT NULL, "totalCents" integer NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "paidAt" TIMESTAMP WITH TIME ZONE, "paymentId" uuid, CONSTRAINT "CHK_7a8eb85c048b2a11b662e264f8" CHECK ("totalCents" >= 0), CONSTRAINT "CHK_b5d0b4865eaf1fecf09a5cb0fe" CHECK ("taxCents" >= 0), CONSTRAINT "CHK_e46b2da1b3f867cc36f5663639" CHECK ("serviceFeeCents" >= 0), CONSTRAINT "CHK_e7e3405c05b8bf70dc67987b4e" CHECK ("subtotalCents" >= 0), CONSTRAINT "PK_0f22733a4e78ff7b532d7be1d4b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_184e944ea7e39a2618a270b053" ON "TicketingOrder"  ("userId", "eventId", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketingOrderItem" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "orderId" uuid NOT NULL, "seatId" uuid NOT NULL, "seatRow" character varying(10) NOT NULL, "seatNumber" character varying(10) NOT NULL, "unitPriceCents" integer NOT NULL, "serviceFeeCents" integer NOT NULL, "taxCents" integer NOT NULL, CONSTRAINT "CHK_5b31ba23e204300dd5e681d5ea" CHECK ("taxCents" >= 0), CONSTRAINT "CHK_e103dbf51fa33a0f0418ef03df" CHECK ("serviceFeeCents" >= 0), CONSTRAINT "CHK_a232f2e1330352c0b1fdb5ec72" CHECK ("unitPriceCents" >= 0), CONSTRAINT "PK_8ca25fbbff80d3b9254f325cc29" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingTicket" ADD "orderItemId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingOrderItem" ADD CONSTRAINT "FK_d5014ae0288936252ca7c5bc325" FOREIGN KEY ("orderId") REFERENCES "TicketingOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingTicket" ADD CONSTRAINT "FK_9c3340c4a1b08ed1a958b6f7b0c" FOREIGN KEY ("orderItemId") REFERENCES "TicketingOrderItem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "TicketingTicket" DROP CONSTRAINT "FK_9c3340c4a1b08ed1a958b6f7b0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingOrderItem" DROP CONSTRAINT "FK_d5014ae0288936252ca7c5bc325"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketingTicket" DROP COLUMN "orderItemId"`,
    );
    await queryRunner.query(`DROP TABLE "TicketingOrderItem"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_184e944ea7e39a2618a270b053"`,
    );
    await queryRunner.query(`DROP TABLE "TicketingOrder"`);
    await queryRunner.query(`DROP TYPE "public"."TicketingOrder_status_enum"`);
  }
}
