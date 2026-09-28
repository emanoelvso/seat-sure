import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790543641838 implements MigrationInterface {
    name = 'Migration1790543641838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "TicketType" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sectionKey" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "priceCents" integer NOT NULL, "currency" character(3) NOT NULL DEFAULT 'USD', "seatsAvailable" integer NOT NULL, "maxPerOrder" integer NOT NULL, "tags" text, "eventId" uuid NOT NULL, CONSTRAINT "UQ_7f13e80da01dc57cf95024ec46a" UNIQUE ("eventId", "sectionKey"), CONSTRAINT "CHK_cf10e826fa99b0a92cfd74148e" CHECK ("maxPerOrder" >= 1), CONSTRAINT "CHK_659fe2c3ba461230b34fce2fe9" CHECK ("seatsAvailable" >= 0), CONSTRAINT "CHK_14eb042f3a107d4995c13c2b0e" CHECK ("priceCents" >= 0), CONSTRAINT "PK_c7cbda99f4f03e4deeb5798c9d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Event" ADD "seatMapId" uuid`);
        await queryRunner.query(`ALTER TABLE "TicketType" ADD CONSTRAINT "FK_ae340fa1c5363a2721ff2346c0b" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Event" ADD CONSTRAINT "FK_4b1d4fbcf126e0c86eefc7dc2d0" FOREIGN KEY ("seatMapId") REFERENCES "SeatMap"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Event" DROP CONSTRAINT "FK_4b1d4fbcf126e0c86eefc7dc2d0"`);
        await queryRunner.query(`ALTER TABLE "TicketType" DROP CONSTRAINT "FK_ae340fa1c5363a2721ff2346c0b"`);
        await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "seatMapId"`);
        await queryRunner.query(`DROP TABLE "TicketType"`);
    }

}
