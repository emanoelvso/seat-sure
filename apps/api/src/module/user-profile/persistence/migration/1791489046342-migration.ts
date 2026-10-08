import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1791489046342 implements MigrationInterface {
  name = 'Migration1791489046342';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "eventReminders" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "exclusiveOffers" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "ticketAvailability" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "emailNotifications" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "pushNotifications" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" ADD "language" character varying(5) NOT NULL DEFAULT 'en'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "language"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "pushNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "emailNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "ticketAvailability"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "exclusiveOffers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "UserProfileUser" DROP COLUMN "eventReminders"`,
    );
  }
}
