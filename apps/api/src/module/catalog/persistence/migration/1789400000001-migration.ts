import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789400000001 implements MigrationInterface {
  name = 'Migration1789400000001';

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
