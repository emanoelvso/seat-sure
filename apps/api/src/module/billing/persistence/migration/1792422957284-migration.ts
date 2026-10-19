import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1792422957284 implements MigrationInterface {
  name = 'Migration1792422957284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cad8eb7723591ca43f2a46da05"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8bd132c5266deabc6b92b411d9" ON "BillingPaymentCard"  ("userId", "provider") WHERE "isDefault"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bd132c5266deabc6b92b411d9"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cad8eb7723591ca43f2a46da05" ON "BillingPaymentCard" USING btree ("userId") WHERE "isDefault"`,
    );
  }
}
