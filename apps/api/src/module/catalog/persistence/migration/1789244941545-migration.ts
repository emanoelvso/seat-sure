import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789244941545 implements MigrationInterface {
    name = 'Migration1789244941545'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Event_type_enum" AS ENUM('concert', 'show', 'sport', 'festival')`);
        await queryRunner.query(`CREATE TYPE "public"."Event_status_enum" AS ENUM('draft', 'published', 'canceled', 'sold_out', 'finished')`);
        await queryRunner.query(`CREATE TABLE "Event" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "type" "public"."Event_type_enum" NOT NULL, "name" character varying(100) NOT NULL, "date" TIMESTAMP NOT NULL, "venue" character varying NOT NULL, "startAt" TIMESTAMP NOT NULL, "endsAt" TIMESTAMP NOT NULL, "doors_open" TIMESTAMP NOT NULL, "status" "public"."Event_status_enum" NOT NULL, "category" character varying NOT NULL, CONSTRAINT "PK_894abf6d0c8562b398c717414d6" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Event"`);
        await queryRunner.query(`DROP TYPE "public"."Event_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Event_type_enum"`);
    }

}
