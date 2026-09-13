import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789400000001 implements MigrationInterface {
  name = 'Migration1789400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Event" ("id", "type", "name", "coverImage", "date", "venue", "startAt", "endsAt", "doorsOpen", "status", "category")
      VALUES
        -- CONCERTS (6 more)
        (
          gen_random_uuid(), 'concert', 'Billie Eilish – Hit Me Hard and Soft Tour',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
          '2026-10-22 00:00:00', 'Jeunesse Arena, Rio de Janeiro',
          '2026-10-22 21:00:00', '2026-10-22 23:30:00', '2026-10-22 19:30:00',
          'published', 'Alternative'
        ),
        (
          gen_random_uuid(), 'concert', 'Taylor Swift – The Eras Tour',
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
          '2026-11-12 00:00:00', 'Estádio do Morumbi, São Paulo',
          '2026-11-12 20:00:00', '2026-11-12 23:45:00', '2026-11-12 18:30:00',
          'published', 'Pop'
        ),
        (
          gen_random_uuid(), 'concert', 'Metallica – M72 World Tour',
          'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
          '2026-12-05 00:00:00', 'Allianz Parque, São Paulo',
          '2026-12-05 20:30:00', '2026-12-05 23:30:00', '2026-12-05 19:00:00',
          'published', 'Metal'
        ),
        (
          gen_random_uuid(), 'concert', 'Bruno Mars – 24K Magic Live',
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
          '2026-10-30 00:00:00', 'Estádio Nilton Santos, Rio de Janeiro',
          '2026-10-30 21:30:00', '2026-10-31 00:00:00', '2026-10-30 20:00:00',
          'published', 'R&B'
        ),
        (
          gen_random_uuid(), 'concert', 'Dua Lipa – Radical Optimism Tour',
          'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
          '2026-11-18 00:00:00', 'Ginásio do Ibirapuera, São Paulo',
          '2026-11-18 21:00:00', '2026-11-18 23:00:00', '2026-11-18 19:30:00',
          'published', 'Pop'
        ),
        (
          gen_random_uuid(), 'concert', 'Kendrick Lamar – GNX Tour',
          'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
          '2026-12-12 00:00:00', 'Maracanã, Rio de Janeiro',
          '2026-12-12 21:00:00', '2026-12-12 23:30:00', '2026-12-12 19:30:00',
          'published', 'Hip-Hop'
        ),

        -- SHOWS (6 more)
        (
          gen_random_uuid(), 'show', 'Hamilton – O Musical',
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
          '2026-10-08 00:00:00', 'Teatro Renault, São Paulo',
          '2026-10-08 20:00:00', '2026-10-08 22:30:00', '2026-10-08 19:00:00',
          'published', 'Musical'
        ),
        (
          gen_random_uuid(), 'show', 'Wicked – O Espetáculo',
          'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800',
          '2026-11-01 00:00:00', 'Teatro Municipal, Rio de Janeiro',
          '2026-11-01 19:30:00', '2026-11-01 22:00:00', '2026-11-01 18:30:00',
          'published', 'Musical'
        ),
        (
          gen_random_uuid(), 'show', 'Kevin Hart – Acting My Age Tour',
          'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800',
          '2026-09-25 00:00:00', 'Espaço das Américas, São Paulo',
          '2026-09-25 21:00:00', '2026-09-25 23:00:00', '2026-09-25 20:00:00',
          'published', 'Stand-Up'
        ),
        (
          gen_random_uuid(), 'show', 'Ballet Bolshoi – Swan Lake',
          'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800',
          '2026-10-20 00:00:00', 'Teatro Alfa, São Paulo',
          '2026-10-20 20:00:00', '2026-10-20 22:30:00', '2026-10-20 19:00:00',
          'published', 'Ballet'
        ),
        (
          gen_random_uuid(), 'show', 'Blue Man Group – Live Experience',
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
          '2026-11-14 00:00:00', 'Teatro Bradesco, São Paulo',
          '2026-11-14 20:30:00', '2026-11-14 22:30:00', '2026-11-14 19:30:00',
          'published', 'Performance Art'
        ),
        (
          gen_random_uuid(), 'show', 'Riverdance – 30th Anniversary',
          'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
          '2026-12-03 00:00:00', 'Vivo Rio, Rio de Janeiro',
          '2026-12-03 20:00:00', '2026-12-03 22:00:00', '2026-12-03 19:00:00',
          'published', 'Dance'
        ),

        -- SPORTS (6 more)
        (
          gen_random_uuid(), 'sport', 'São Paulo vs Corinthians – Paulistão Final',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
          '2026-10-05 00:00:00', 'Estádio do Morumbi, São Paulo',
          '2026-10-05 18:00:00', '2026-10-05 20:00:00', '2026-10-05 16:30:00',
          'published', 'Football'
        ),
        (
          gen_random_uuid(), 'sport', 'NBA Global Games – Lakers vs Warriors',
          'https://images.unsplash.com/photo-1546519638405-a9f9d3b0b9c5?w=800',
          '2026-10-25 00:00:00', 'Ginásio do Maracanãzinho, Rio de Janeiro',
          '2026-10-25 20:00:00', '2026-10-25 22:30:00', '2026-10-25 18:30:00',
          'published', 'Basketball'
        ),
        (
          gen_random_uuid(), 'sport', 'Grande Prêmio do Brasil – Formula 1',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
          '2026-11-08 00:00:00', 'Autódromo de Interlagos, São Paulo',
          '2026-11-08 13:00:00', '2026-11-08 16:00:00', '2026-11-08 10:00:00',
          'published', 'Motorsport'
        ),
        (
          gen_random_uuid(), 'sport', 'ATP 500 Rio Open – Final',
          'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
          '2026-10-11 00:00:00', 'Arena Carioca, Rio de Janeiro',
          '2026-10-11 15:00:00', '2026-10-11 18:00:00', '2026-10-11 14:00:00',
          'published', 'Tennis'
        ),
        (
          gen_random_uuid(), 'sport', 'Vôlei de Praia – Mundial de Copacabana',
          'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
          '2026-11-22 00:00:00', 'Arena de Copacabana, Rio de Janeiro',
          '2026-11-22 10:00:00', '2026-11-22 20:00:00', '2026-11-22 09:00:00',
          'published', 'Volleyball'
        ),
        (
          gen_random_uuid(), 'sport', 'Boxe – Campeonato Brasileiro de Pesos Pesados',
          'https://images.unsplash.com/photo-1547919307-1ecb10702e6f?w=800',
          '2026-12-06 00:00:00', 'Ginásio do Ibirapuera, São Paulo',
          '2026-12-06 19:00:00', '2026-12-06 23:00:00', '2026-12-06 18:00:00',
          'published', 'Boxing'
        ),

        -- FESTIVALS (6 more)
        (
          gen_random_uuid(), 'festival', 'Rock in Rio 2026',
          'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800',
          '2026-09-19 00:00:00', 'Cidade do Rock, Rio de Janeiro',
          '2026-09-19 13:00:00', '2026-09-19 23:59:00', '2026-09-19 12:00:00',
          'published', 'Rock'
        ),
        (
          gen_random_uuid(), 'festival', 'Tomorrowland Brasil 2026',
          'https://images.unsplash.com/photo-1571266028191-e1d69c636e05?w=800',
          '2026-10-16 00:00:00', 'Parque Maeda, Itu – SP',
          '2026-10-16 14:00:00', '2026-10-16 23:59:00', '2026-10-16 13:00:00',
          'published', 'Electronic'
        ),
        (
          gen_random_uuid(), 'festival', 'Primavera Sound São Paulo',
          'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
          '2026-11-07 00:00:00', 'Distrito Anhembi, São Paulo',
          '2026-11-07 13:00:00', '2026-11-07 23:59:00', '2026-11-07 12:00:00',
          'published', 'Indie'
        ),
        (
          gen_random_uuid(), 'festival', 'Festival Afropunk Salvador',
          'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800',
          '2026-12-27 00:00:00', 'Parque de Exposições, Salvador',
          '2026-12-27 15:00:00', '2026-12-27 23:59:00', '2026-12-27 14:00:00',
          'published', 'Afrobeat'
        ),
        (
          gen_random_uuid(), 'festival', 'Anime Friends 2026',
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
          '2026-07-10 00:00:00', 'Expo Center Norte, São Paulo',
          '2026-07-10 10:00:00', '2026-07-10 22:00:00', '2026-07-10 09:00:00',
          'published', 'Pop Culture'
        ),
        (
          gen_random_uuid(), 'festival', 'Oktoberfest Blumenau 2026',
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
          '2026-10-03 00:00:00', 'Vila Germânica, Blumenau – SC',
          '2026-10-03 17:00:00', '2026-10-03 23:59:00', '2026-10-03 16:00:00',
          'published', 'Cultural'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "Event"
      WHERE "name" IN (
        'Billie Eilish – Hit Me Hard and Soft Tour',
        'Taylor Swift – The Eras Tour',
        'Metallica – M72 World Tour',
        'Bruno Mars – 24K Magic Live',
        'Dua Lipa – Radical Optimism Tour',
        'Kendrick Lamar – GNX Tour',
        'Hamilton – O Musical',
        'Wicked – O Espetáculo',
        'Kevin Hart – Acting My Age Tour',
        'Ballet Bolshoi – Swan Lake',
        'Blue Man Group – Live Experience',
        'Riverdance – 30th Anniversary',
        'São Paulo vs Corinthians – Paulistão Final',
        'NBA Global Games – Lakers vs Warriors',
        'Grande Prêmio do Brasil – Formula 1',
        'ATP 500 Rio Open – Final',
        'Vôlei de Praia – Mundial de Copacabana',
        'Boxe – Campeonato Brasileiro de Pesos Pesados',
        'Rock in Rio 2026',
        'Tomorrowland Brasil 2026',
        'Primavera Sound São Paulo',
        'Festival Afropunk Salvador',
        'Anime Friends 2026',
        'Oktoberfest Blumenau 2026'
      )
    `);
  }
}
