import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789399500000 implements MigrationInterface {
    name = 'Migration1789399500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Event" ADD "tags" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Event" DROP COLUMN "tags"`);
    }

}
