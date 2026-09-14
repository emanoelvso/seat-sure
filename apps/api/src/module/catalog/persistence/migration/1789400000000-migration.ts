import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789400000000 implements MigrationInterface {
  name = 'Migration1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Event" ("id", "type", "name", "description", "coverImage", "date", "venue", "city", "country", "startAt", "endsAt", "doorsOpen", "status", "category", "price")
      VALUES
        -- CONCERTS
        (
          gen_random_uuid(), 'concert', 'The Weeknd',
          'After Hours Til Dawn Tour',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
          '2026-10-15 00:00:00', 'Allianz Parque', 'São Paulo', 'Brazil',
          '2026-10-15 21:00:00', '2026-10-16 00:30:00', '2026-10-15 19:30:00',
          'published', 'Pop', 299.99
        ),
        (
          gen_random_uuid(), 'concert', 'Coldplay',
          'Music of the Spheres World Tour',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
          '2026-11-05 00:00:00', 'Estádio Nilton Santos', 'Rio de Janeiro', 'Brazil',
          '2026-11-05 20:30:00', '2026-11-05 23:59:00', '2026-11-05 19:00:00',
          'published', 'Rock', 349.99
        ),
        (
          gen_random_uuid(), 'concert', 'Billie Eilish',
          'Hit Me Hard and Soft Tour',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
          '2026-10-22 00:00:00', 'Jeunesse Arena', 'Rio de Janeiro', 'Brazil',
          '2026-10-22 21:00:00', '2026-10-22 23:30:00', '2026-10-22 19:30:00',
          'published', 'Alternative', 199.99
        ),
        (
          gen_random_uuid(), 'concert', 'Taylor Swift',
          'The Eras Tour',
          'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
          '2026-11-12 00:00:00', 'Allianz Parque', 'São Paulo', 'Brazil',
          '2026-11-12 20:00:00', '2026-11-12 23:45:00', '2026-11-12 18:30:00',
          'published', 'Pop', 449.99
        ),
        (
          gen_random_uuid(), 'concert', 'Metallica',
          'M72 World Tour',
          'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
          '2026-12-05 00:00:00', 'Estádio MorumBIS', 'São Paulo', 'Brazil',
          '2026-12-05 20:30:00', '2026-12-05 23:30:00', '2026-12-05 19:00:00',
          'published', 'Metal', 279.99
        ),
        (
          gen_random_uuid(), 'concert', 'Bruno Mars',
          '24K Magic Live',
          'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
          '2026-10-30 00:00:00', 'Jeunesse Arena', 'Rio de Janeiro', 'Brazil',
          '2026-10-30 21:30:00', '2026-10-31 00:00:00', '2026-10-30 20:00:00',
          'published', 'R&B', 329.99
        ),
        (
          gen_random_uuid(), 'concert', 'Dua Lipa',
          'Radical Optimism Tour',
          'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
          '2026-11-18 00:00:00', 'Allianz Parque', 'São Paulo', 'Brazil',
          '2026-11-18 21:00:00', '2026-11-18 23:00:00', '2026-11-18 19:30:00',
          'published', 'Pop', 259.99
        ),
        (
          gen_random_uuid(), 'concert', 'Kendrick Lamar',
          'GNX Tour',
          'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
          '2026-12-12 00:00:00', 'Engenhão', 'Rio de Janeiro', 'Brazil',
          '2026-12-12 21:00:00', '2026-12-12 23:30:00', '2026-12-12 19:30:00',
          'published', 'Hip-Hop', 239.99
        ),

        -- SHOWS
        (
          gen_random_uuid(), 'show', 'Cirque du Soleil',
          'Alegría — Back in a New Light',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-09-20 00:00:00', 'Pavilhão do Anhembi', 'São Paulo', 'Brazil',
          '2026-09-20 20:00:00', '2026-09-20 22:30:00', '2026-09-20 19:00:00',
          'published', 'Circus', 189.99
        ),
        (
          gen_random_uuid(), 'show', 'Chappell Roan',
          'The Midwest Princess Tour',
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
          '2026-10-02 00:00:00', 'Tokio Marine Hall', 'São Paulo', 'Brazil',
          '2026-10-02 21:00:00', '2026-10-02 23:00:00', '2026-10-02 20:00:00',
          'published', 'Pop', 149.99
        ),
        (
          gen_random_uuid(), 'show', 'Hamilton',
          'The Hit Broadway Musical',
          'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
          '2026-10-08 00:00:00', 'Teatro Renault', 'São Paulo', 'Brazil',
          '2026-10-08 20:00:00', '2026-10-08 22:30:00', '2026-10-08 19:00:00',
          'published', 'Musical', 219.99
        ),
        (
          gen_random_uuid(), 'show', 'Wicked',
          'The Legendary Musical',
          'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800',
          '2026-11-01 00:00:00', 'Teatro Carlos Gomes', 'Rio de Janeiro', 'Brazil',
          '2026-11-01 19:30:00', '2026-11-01 22:00:00', '2026-11-01 18:30:00',
          'published', 'Musical', 179.99
        ),
        (
          gen_random_uuid(), 'show', 'Kevin Hart',
          'Acting My Age Tour',
          'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800',
          '2026-09-25 00:00:00', 'Ginásio do Ibirapuera', 'São Paulo', 'Brazil',
          '2026-09-25 21:00:00', '2026-09-25 23:00:00', '2026-09-25 20:00:00',
          'published', 'Stand-Up', 129.99
        ),
        (
          gen_random_uuid(), 'show', 'Ballet Bolshoi',
          'Swan Lake',
          'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800',
          '2026-10-20 00:00:00', 'Teatro Municipal', 'São Paulo', 'Brazil',
          '2026-10-20 20:00:00', '2026-10-20 22:30:00', '2026-10-20 19:00:00',
          'published', 'Ballet', 159.99
        ),
        (
          gen_random_uuid(), 'show', 'Blue Man Group',
          'Live Experience',
          'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
          '2026-11-14 00:00:00', 'Teatro Bradesco', 'São Paulo', 'Brazil',
          '2026-11-14 20:30:00', '2026-11-14 22:30:00', '2026-11-14 19:30:00',
          'published', 'Performance Art', 139.99
        ),
        (
          gen_random_uuid(), 'show', 'Riverdance',
          '30th Anniversary Show',
          'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
          '2026-12-03 00:00:00', 'Vivo Rio', 'Rio de Janeiro', 'Brazil',
          '2026-12-03 20:00:00', '2026-12-03 22:00:00', '2026-12-03 19:00:00',
          'published', 'Dance', 169.99
        ),

        -- SPORTS
        (
          gen_random_uuid(), 'sport', 'Flamengo vs Palmeiras',
          'Brasileirão Série A',
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
          '2026-09-28 00:00:00', 'Maracanã', 'Rio de Janeiro', 'Brazil',
          '2026-09-28 16:00:00', '2026-09-28 18:00:00', '2026-09-28 14:30:00',
          'published', 'Football', 89.99
        ),
        (
          gen_random_uuid(), 'sport', 'UFC 310',
          'Main Event Night',
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
          '2026-10-18 00:00:00', 'Jeunesse Arena', 'Rio de Janeiro', 'Brazil',
          '2026-10-18 19:00:00', '2026-10-18 23:30:00', '2026-10-18 17:30:00',
          'published', 'MMA', 199.99
        ),
        (
          gen_random_uuid(), 'sport', 'São Paulo vs Corinthians',
          'Paulistão Final',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
          '2026-10-05 00:00:00', 'Estádio MorumBIS', 'São Paulo', 'Brazil',
          '2026-10-05 18:00:00', '2026-10-05 20:00:00', '2026-10-05 16:30:00',
          'published', 'Football', 79.99
        ),
        (
          gen_random_uuid(), 'sport', 'Lakers vs Warriors',
          'NBA Global Games',
          'https://images.unsplash.com/photo-1546519638405-a9f9d3b0b9c5?w=800',
          '2026-10-25 00:00:00', 'Jeunesse Arena', 'Rio de Janeiro', 'Brazil',
          '2026-10-25 20:00:00', '2026-10-25 22:30:00', '2026-10-25 18:30:00',
          'published', 'Basketball', 249.99
        ),
        (
          gen_random_uuid(), 'sport', 'Formula 1',
          'Grande Prêmio do Brasil',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
          '2026-11-08 00:00:00', 'Autódromo de Interlagos', 'São Paulo', 'Brazil',
          '2026-11-08 13:00:00', '2026-11-08 16:00:00', '2026-11-08 10:00:00',
          'published', 'Motorsport', 299.99
        ),
        (
          gen_random_uuid(), 'sport', 'ATP 500',
          'Rio Open Final',
          'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
          '2026-10-11 00:00:00', 'Jockey Club Brasileiro', 'Rio de Janeiro', 'Brazil',
          '2026-10-11 15:00:00', '2026-10-11 18:00:00', '2026-10-11 14:00:00',
          'published', 'Tennis', 149.99
        ),
        (
          gen_random_uuid(), 'sport', 'Vôlei de Praia',
          'Mundial de Vôlei de Praia',
          'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800',
          '2026-11-22 00:00:00', 'Praia de Copacabana', 'Rio de Janeiro', 'Brazil',
          '2026-11-22 10:00:00', '2026-11-22 20:00:00', '2026-11-22 09:00:00',
          'published', 'Volleyball', 59.99
        ),
        (
          gen_random_uuid(), 'sport', 'Boxe',
          'Campeonato Brasileiro de Pesos Pesados',
          'https://images.unsplash.com/photo-1547919307-1ecb10702e6f?w=800',
          '2026-12-06 00:00:00', 'Ginásio do Ibirapuera', 'São Paulo', 'Brazil',
          '2026-12-06 19:00:00', '2026-12-06 23:00:00', '2026-12-06 18:00:00',
          'published', 'Boxing', 129.99
        ),

        -- FESTIVALS
        (
          gen_random_uuid(), 'festival', 'Lollapalooza',
          'Multi-genre music festival',
          'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
          '2026-11-20 00:00:00', 'Autódromo de Interlagos', 'São Paulo', 'Brazil',
          '2026-11-20 12:00:00', '2026-11-20 23:59:00', '2026-11-20 11:00:00',
          'published', 'Multi-genre', 399.99
        ),
        (
          gen_random_uuid(), 'festival', 'São Paulo Gastronômico',
          'O maior festival gastronômico do Brasil',
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
          '2026-10-10 00:00:00', 'Parque Ibirapuera', 'São Paulo', 'Brazil',
          '2026-10-10 11:00:00', '2026-10-10 22:00:00', '2026-10-10 10:30:00',
          'published', 'Gastronomy', 49.99
        ),
        (
          gen_random_uuid(), 'festival', 'Rock in Rio',
          'The biggest rock festival in the world',
          'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800',
          '2026-09-19 00:00:00', 'Cidade do Rock', 'Rio de Janeiro', 'Brazil',
          '2026-09-19 13:00:00', '2026-09-19 23:59:00', '2026-09-19 12:00:00',
          'published', 'Rock', 349.99
        ),
        (
          gen_random_uuid(), 'festival', 'Tomorrowland',
          'The world''s biggest electronic music festival',
          'https://images.unsplash.com/photo-1571266028191-e1d69c636e05?w=800',
          '2026-10-16 00:00:00', 'Parque Maeda', 'Itu', 'Brazil',
          '2026-10-16 14:00:00', '2026-10-16 23:59:00', '2026-10-16 13:00:00',
          'published', 'Electronic', 499.99
        ),
        (
          gen_random_uuid(), 'festival', 'Primavera Sound',
          'The iconic indie music festival',
          'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
          '2026-11-07 00:00:00', 'Autódromo de Interlagos', 'São Paulo', 'Brazil',
          '2026-11-07 13:00:00', '2026-11-07 23:59:00', '2026-11-07 12:00:00',
          'published', 'Indie', 299.99
        ),
        (
          gen_random_uuid(), 'festival', 'Festival Afropunk',
          'Celebrating Afrobeat and Black culture',
          'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800',
          '2026-12-27 00:00:00', 'Parque de Exposições', 'Salvador', 'Brazil',
          '2026-12-27 15:00:00', '2026-12-27 23:59:00', '2026-12-27 14:00:00',
          'published', 'Afrobeat', 149.99
        ),
        (
          gen_random_uuid(), 'festival', 'Anime Friends',
          'The biggest anime and pop culture festival in Latin America',
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
          '2026-07-10 00:00:00', 'Expo Center Norte', 'São Paulo', 'Brazil',
          '2026-07-10 10:00:00', '2026-07-10 22:00:00', '2026-07-10 09:00:00',
          'published', 'Pop Culture', 79.99
        ),
        (
          gen_random_uuid(), 'festival', 'Oktoberfest',
          'The second biggest Oktoberfest in the world',
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
          '2026-10-03 00:00:00', 'Vila Germânica', 'Blumenau', 'Brazil',
          '2026-10-03 17:00:00', '2026-10-03 23:59:00', '2026-10-03 16:00:00',
          'published', 'Cultural', 39.99
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "Event"`);
  }
}
