import { MigrationInterface, QueryRunner } from 'typeorm';

const UNSPLASH = 'https://images.unsplash.com/';

// Unsplash removed these photos (they answer 404). Each pair is
// [dead URL, replacement URL]; the width suffix is part of the stored value.
const EVENT_COVERS: ReadonlyArray<[string, string]> = [
  [
    `${UNSPLASH}photo-1571266028243-e4733b0f0bb0?w=800`,
    `${UNSPLASH}photo-1493676304819-0d7a8d026dcf?w=800`,
  ],
  [
    `${UNSPLASH}photo-1508098682722-e99c43a406b2?w=800`,
    `${UNSPLASH}photo-1522778119026-d647f0596c20?w=800`,
  ],
  [
    `${UNSPLASH}photo-1546519638405-a9f9d3b0b9c5?w=800`,
    `${UNSPLASH}photo-1546519638-68e109498ffc?w=800`,
  ],
  [
    `${UNSPLASH}photo-1571266028191-e1d69c636e05?w=800`,
    `${UNSPLASH}photo-1459749411175-04bf5292ceea?w=800`,
  ],
];

const ARTIST_COVERS: ReadonlyArray<[string, string]> = [
  [
    `${UNSPLASH}photo-1571266028243-e4733b0f0bb0?w=1200`,
    `${UNSPLASH}photo-1493676304819-0d7a8d026dcf?w=1200`,
  ],
];

export class Migration1792000000000 implements MigrationInterface {
  name = 'Migration1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.swap(queryRunner, EVENT_COVERS, ARTIST_COVERS, 0, 1);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.swap(queryRunner, EVENT_COVERS, ARTIST_COVERS, 1, 0);
  }

  private async swap(
    queryRunner: QueryRunner,
    events: ReadonlyArray<[string, string]>,
    artists: ReadonlyArray<[string, string]>,
    from: 0 | 1,
    to: 0 | 1,
  ): Promise<void> {
    for (const pair of events) {
      await queryRunner.query(
        `UPDATE "CatalogEvent" SET "coverImage" = $1 WHERE "coverImage" = $2`,
        [pair[to], pair[from]],
      );
    }
    for (const pair of artists) {
      await queryRunner.query(
        `UPDATE "CatalogArtist" SET "cover_image_url" = $1 WHERE "cover_image_url" = $2`,
        [pair[to], pair[from]],
      );
    }
  }
}
