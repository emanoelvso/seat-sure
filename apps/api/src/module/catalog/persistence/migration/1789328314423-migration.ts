import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789328314423 implements MigrationInterface {
    name = 'Migration1789328314423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "doors_open"`);
        await queryRunner.query(`ALTER TABLE "Event" ADD "coverImage" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Event" ADD "doorsOpen" TIMESTAMP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "doorsOpen"`);
        await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "coverImage"`);
        await queryRunner.query(`ALTER TABLE "Event" ADD "doors_open" TIMESTAMP NOT NULL`);
    }

}
