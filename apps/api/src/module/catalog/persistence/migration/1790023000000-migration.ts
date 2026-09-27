import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790023000000 implements MigrationInterface {
  name = 'Migration1790023000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Event" ("id", "type", "name", "description", "coverImage", "date", "venue", "city", "country", "startAt", "endsAt", "doorsOpen", "status", "category", "price", "tags")
      VALUES
        -- ADELE — Weekends with Adele residency + world tour
        (
          gen_random_uuid(), 'concert', 'Adele',
          'Weekends with Adele — Las Vegas Residency',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-11-06 00:00:00', 'The Colosseum at Caesars Palace', 'Las Vegas', 'USA',
          '2026-11-06 20:00:00', '2026-11-06 22:30:00', '2026-11-06 19:00:00',
          'published', 'Pop', 449.99, 'Popular,Best Seller,Almost Sold Out'
        ),
        (
          gen_random_uuid(), 'concert', 'Adele',
          'Weekends with Adele — Las Vegas Residency',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-11-07 00:00:00', 'The Colosseum at Caesars Palace', 'Las Vegas', 'USA',
          '2026-11-07 20:00:00', '2026-11-07 22:30:00', '2026-11-07 19:00:00',
          'published', 'Pop', 449.99, 'Best Seller,Almost Sold Out'
        ),
        (
          gen_random_uuid(), 'concert', 'Adele',
          'Weekends with Adele — Las Vegas Residency',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-11-13 00:00:00', 'The Colosseum at Caesars Palace', 'Las Vegas', 'USA',
          '2026-11-13 20:00:00', '2026-11-13 22:30:00', '2026-11-13 19:00:00',
          'published', 'Pop', 449.99, 'Popular,Almost Sold Out'
        ),
        (
          gen_random_uuid(), 'concert', 'Adele',
          'Weekends with Adele — Las Vegas Residency',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-11-14 00:00:00', 'The Colosseum at Caesars Palace', 'Las Vegas', 'USA',
          '2026-11-14 20:00:00', '2026-11-14 22:30:00', '2026-11-14 19:00:00',
          'published', 'Pop', 449.99, 'Almost Sold Out,Selling Fast'
        ),
        (
          gen_random_uuid(), 'concert', 'Adele',
          '30 World Tour — Live in New York',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-12-04 00:00:00', 'Madison Square Garden', 'New York', 'USA',
          '2026-12-04 20:30:00', '2026-12-04 23:00:00', '2026-12-04 19:30:00',
          'published', 'Pop', 389.99, 'Best Seller,Popular'
        ),
        (
          gen_random_uuid(), 'concert', 'Adele',
          '30 World Tour — Live in London',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-12-18 00:00:00', 'The O2 Arena', 'London', 'United Kingdom',
          '2026-12-18 20:00:00', '2026-12-18 22:30:00', '2026-12-18 19:00:00',
          'published', 'Pop', 419.99, 'Today''s Pick,Popular'
        ),

        -- EXTRA TOUR DATES (populate artist pages)
        (
          gen_random_uuid(), 'concert', 'The Weeknd',
          'After Hours Til Dawn Tour',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
          '2026-11-02 00:00:00', 'Estádio Nacional de Brasília', 'Brasília', 'Brazil',
          '2026-11-02 21:00:00', '2026-11-03 00:00:00', '2026-11-02 19:30:00',
          'published', 'Pop', 289.99, 'Selling Fast'
        ),
        (
          gen_random_uuid(), 'concert', 'The Weeknd',
          'After Hours Til Dawn Tour',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
          '2026-11-16 00:00:00', 'Arena Fonte Nova', 'Salvador', 'Brazil',
          '2026-11-16 21:00:00', '2026-11-17 00:00:00', '2026-11-16 19:30:00',
          'published', 'Pop', 279.99, 'New'
        ),
        (
          gen_random_uuid(), 'concert', 'Coldplay',
          'Music of the Spheres World Tour',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
          '2026-11-09 00:00:00', 'Estádio Beira-Rio', 'Porto Alegre', 'Brazil',
          '2026-11-09 20:30:00', '2026-11-09 23:59:00', '2026-11-09 19:00:00',
          'published', 'Rock', 339.99, 'Popular'
        ),
        (
          gen_random_uuid(), 'concert', 'Coldplay',
          'Music of the Spheres World Tour',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
          '2026-11-15 00:00:00', 'Estádio Mineirão', 'Belo Horizonte', 'Brazil',
          '2026-11-15 20:30:00', '2026-11-15 23:59:00', '2026-11-15 19:00:00',
          'published', 'Rock', 329.99, 'Great'
        ),
        (
          gen_random_uuid(), 'concert', 'Taylor Swift',
          'The Eras Tour',
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
          '2026-11-19 00:00:00', 'Estádio MorumBIS', 'São Paulo', 'Brazil',
          '2026-11-19 20:00:00', '2026-11-19 23:45:00', '2026-11-19 18:30:00',
          'published', 'Pop', 449.99, 'Popular,Almost Sold Out'
        ),
        (
          gen_random_uuid(), 'concert', 'Taylor Swift',
          'The Eras Tour',
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
          '2026-11-26 00:00:00', 'Estádio Nilton Santos', 'Rio de Janeiro', 'Brazil',
          '2026-11-26 20:00:00', '2026-11-26 23:45:00', '2026-11-26 18:30:00',
          'published', 'Pop', 449.99, 'Almost Sold Out,Selling Fast,Popular'
        )
    `);

    await queryRunner.query(`
      INSERT INTO "EventArtist" ("id", "eventId", "artistId", "headliner", "performance_order")
      SELECT gen_random_uuid(), e.id, a.id, true, 1
      FROM "Event" e
      INNER JOIN "Artist" a ON a.stage_name = e.name
      WHERE NOT EXISTS (
        SELECT 1 FROM "EventArtist" ea
        WHERE ea."eventId" = e.id AND ea."artistId" = a.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "EventArtist"
      WHERE "eventId" IN (
        SELECT id FROM "Event"
        WHERE (name = 'Adele')
           OR (name = 'The Weeknd' AND city IN ('Brasília', 'Salvador'))
           OR (name = 'Coldplay' AND city IN ('Porto Alegre', 'Belo Horizonte'))
           OR (name = 'Taylor Swift' AND city = 'São Paulo' AND date = '2026-11-19 00:00:00')
           OR (name = 'Taylor Swift' AND city = 'Rio de Janeiro' AND date = '2026-11-26 00:00:00')
      )
    `);
    await queryRunner.query(`
      DELETE FROM "Event"
      WHERE (name = 'Adele')
         OR (name = 'The Weeknd' AND city IN ('Brasília', 'Salvador'))
         OR (name = 'Coldplay' AND city IN ('Porto Alegre', 'Belo Horizonte'))
         OR (name = 'Taylor Swift' AND city = 'São Paulo' AND date = '2026-11-19 00:00:00')
         OR (name = 'Taylor Swift' AND city = 'Rio de Janeiro' AND date = '2026-11-26 00:00:00')
    `);
  }
}
