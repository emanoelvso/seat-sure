import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1770382659670 implements MigrationInterface {
  name = 'Migration1770382659670';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" ADD "version" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" DROP CONSTRAINT "FK_b6ac53aff4b7200e4b01ca43a9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" ALTER COLUMN "contentId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" DROP CONSTRAINT "FK_c155b5944bdd1e260a4ae79bc82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" ALTER COLUMN "contentId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" DROP CONSTRAINT "FK_678d67fbd94f3a4f4c57a0507b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" ALTER COLUMN "videoId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" ADD CONSTRAINT "FK_b6ac53aff4b7200e4b01ca43a9c" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" ADD CONSTRAINT "FK_c155b5944bdd1e260a4ae79bc82" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" ADD CONSTRAINT "FK_678d67fbd94f3a4f4c57a0507b0" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" DROP CONSTRAINT "FK_678d67fbd94f3a4f4c57a0507b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" DROP CONSTRAINT "FK_c155b5944bdd1e260a4ae79bc82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" DROP CONSTRAINT "FK_b6ac53aff4b7200e4b01ca43a9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" ALTER COLUMN "videoId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" ADD CONSTRAINT "FK_678d67fbd94f3a4f4c57a0507b0" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" ALTER COLUMN "contentId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Movie" ADD CONSTRAINT "FK_c155b5944bdd1e260a4ae79bc82" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" ALTER COLUMN "contentId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "TvShow" ADD CONSTRAINT "FK_b6ac53aff4b7200e4b01ca43a9c" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "VideoMetadata" DROP COLUMN "version"`,
    );
  }
}
