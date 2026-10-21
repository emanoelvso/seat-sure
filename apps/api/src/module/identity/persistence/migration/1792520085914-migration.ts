import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1792520085914 implements MigrationInterface {
  name = 'Migration1792520085914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "IdentityAccountDeletion" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" uuid NOT NULL, "completedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_01fe73bf7fb190017400ae77585" UNIQUE ("userId"), CONSTRAINT "PK_bd4220dbf68e1c4d88a39c388cd" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "IdentityAccountDeletion"`);
  }
}
