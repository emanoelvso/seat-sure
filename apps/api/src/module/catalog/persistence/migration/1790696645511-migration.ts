import { MigrationInterface, QueryRunner } from 'typeorm';

// Stores event times as instants (ADR-003). The existing values are wall times
// written by a Node process at America/Sao_Paulo, so they are read in that
// zone. AT TIME ZONE applies the offset in force at each value's date.
const COLUMNS = ['date', 'startAt', 'endsAt', 'doorsOpen'];

export class Migration1790696645511 implements MigrationInterface {
  name = 'Migration1790696645511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "CatalogEvent" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE USING "${column}" AT TIME ZONE 'America/Sao_Paulo'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "CatalogEvent" ALTER COLUMN "${column}" TYPE TIMESTAMP WITHOUT TIME ZONE USING "${column}" AT TIME ZONE 'America/Sao_Paulo'`,
      );
    }
  }
}
