import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790022000000 implements MigrationInterface {
  name = 'Migration1790022000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Artist" ("id", "slug", "stage_name", "bio", "cover_image_url", "genres")
      VALUES
        (
          gen_random_uuid(), 'adele', 'Adele',
          'British singer-songwriter known for her powerhouse vocals and record-breaking albums 19, 21, 25 and 30.',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
          'pop,soul,ballad'
        ),
        (
          gen_random_uuid(), 'the-weeknd', 'The Weeknd',
          'Canadian singer whose blend of R&B, pop and synthwave produced global hits like Blinding Lights and Save Your Tears.',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
          'pop,r&b,synthwave'
        ),
        (
          gen_random_uuid(), 'coldplay', 'Coldplay',
          'British rock band led by Chris Martin, touring the world with the Music of the Spheres show.',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200',
          'rock,alternative,pop'
        ),
        (
          gen_random_uuid(), 'billie-eilish', 'Billie Eilish',
          'American singer-songwriter and multiple Grammy winner known for her whispered vocals and dark-pop production.',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
          'alternative,pop,electropop'
        ),
        (
          gen_random_uuid(), 'taylor-swift', 'Taylor Swift',
          'American singer-songwriter whose Eras Tour became the highest-grossing concert tour in history.',
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
          'pop,country,folk'
        ),
        (
          gen_random_uuid(), 'metallica', 'Metallica',
          'American heavy metal band and one of the founding "big four" of thrash metal, now on their M72 world tour.',
          'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200',
          'metal,thrash,rock'
        ),
        (
          gen_random_uuid(), 'bruno-mars', 'Bruno Mars',
          'American singer, songwriter and producer known for his retro pop, funk and R&B sound.',
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200',
          'pop,funk,r&b'
        ),
        (
          gen_random_uuid(), 'dua-lipa', 'Dua Lipa',
          'British-Albanian pop singer whose Radical Optimism album continues her run of disco-inflected hits.',
          'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200',
          'pop,disco,dance'
        ),
        (
          gen_random_uuid(), 'kendrick-lamar', 'Kendrick Lamar',
          'Pulitzer Prize-winning American rapper regarded as one of the most influential hip-hop artists of his generation.',
          'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200',
          'hip-hop,rap'
        ),
        (
          gen_random_uuid(), 'chappell-roan', 'Chappell Roan',
          'American pop singer-songwriter whose theatrical live shows shot her Midwest Princess tour to sold-out venues.',
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
          'pop,synthpop'
        ),
        (
          gen_random_uuid(), 'kevin-hart', 'Kevin Hart',
          'American comedian and actor whose Acting My Age tour packs arenas across the world.',
          'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=1200',
          'stand-up,comedy'
        )
    `);

    await queryRunner.query(`
      INSERT INTO "EventArtist" ("id", "eventId", "artistId", "headliner", "performance_order")
      SELECT gen_random_uuid(), e.id, a.id, true, 1
      FROM "Event" e
      INNER JOIN "Artist" a ON a.stage_name = e.name
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "EventArtist"`);
    await queryRunner.query(`DELETE FROM "Artist"`);
  }
}
