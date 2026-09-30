import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790021774679 implements MigrationInterface {
  name = 'Migration1790021774679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "EventArtist" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "headliner" boolean NOT NULL DEFAULT false, "performance_order" integer, "eventId" uuid, "artistId" uuid, CONSTRAINT "PK_dbe1d4c37eed07f58003013a2cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Artist" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "slug" character varying(20) NOT NULL, "stage_name" character varying(50) NOT NULL, "bio" character varying(200) NOT NULL, "cover_image_url" character varying NOT NULL, "genres" text NOT NULL, CONSTRAINT "UQ_b943c2b7131dbffe5162db77a72" UNIQUE ("slug"), CONSTRAINT "UQ_377bcd3a2620d2f9551326af7f7" UNIQUE ("stage_name"), CONSTRAINT "PK_7c07e38dd0d817a103966c5876e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "Venue" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "address" character varying(100) NOT NULL, "city" character varying(100) NOT NULL, "state" character varying(20) NOT NULL, "country" character varying(15) NOT NULL, "latitude" numeric NOT NULL, "longitude" numeric NOT NULL, "capacity" integer NOT NULL, CONSTRAINT "PK_ec27dedc12b8fa53b5a31ace722" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "SeatMap" ("id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "layout" jsonb NOT NULL, "venueId" uuid, CONSTRAINT "PK_93423f3eaf606695e6364558597" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "city" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "country" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "price" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "EventArtist" ADD CONSTRAINT "FK_234a99f6eb4beed8263e5d38080" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "EventArtist" ADD CONSTRAINT "FK_7ca78d439d14e6250fcb7c4b090" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "SeatMap" ADD CONSTRAINT "FK_03b1b4862798fd6e808ad912589" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "SeatMap" DROP CONSTRAINT "FK_03b1b4862798fd6e808ad912589"`,
    );
    await queryRunner.query(
      `ALTER TABLE "EventArtist" DROP CONSTRAINT "FK_7ca78d439d14e6250fcb7c4b090"`,
    );
    await queryRunner.query(
      `ALTER TABLE "EventArtist" DROP CONSTRAINT "FK_234a99f6eb4beed8263e5d38080"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "price" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "country" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "Event" ALTER COLUMN "city" SET DEFAULT ''`,
    );
    await queryRunner.query(`DROP TABLE "SeatMap"`);
    await queryRunner.query(`DROP TABLE "Venue"`);
    await queryRunner.query(`DROP TABLE "Artist"`);
    await queryRunner.query(`DROP TABLE "EventArtist"`);
  }
}
