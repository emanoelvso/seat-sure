import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789400000000 implements MigrationInterface {
  name = 'Migration1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "Event" ("id", "type", "name", "coverImage", "date", "venue", "startAt", "endsAt", "doorsOpen", "status", "category")
      VALUES
        (
          gen_random_uuid(), 'concert', 'The Weeknd – After Hours Tour',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
          '2026-10-15 00:00:00', 'Allianz Parque, São Paulo',
          '2026-10-15 21:00:00', '2026-10-16 00:30:00', '2026-10-15 19:30:00',
          'published', 'Pop'
        ),
        (
          gen_random_uuid(), 'concert', 'Coldplay – Music of the Spheres',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
          '2026-11-05 00:00:00', 'Estádio Nilton Santos, Rio de Janeiro',
          '2026-11-05 20:30:00', '2026-11-05 23:59:00', '2026-11-05 19:00:00',
          'published', 'Rock'
        ),
        (
          gen_random_uuid(), 'show', 'Cirque du Soleil – Alegría',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
          '2026-09-20 00:00:00', 'Ginásio do Ibirapuera, São Paulo',
          '2026-09-20 20:00:00', '2026-09-20 22:30:00', '2026-09-20 19:00:00',
          'published', 'Circus'
        ),
        (
          gen_random_uuid(), 'show', 'Chappell Roan – Stand-Up Special',
          'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
          '2026-10-02 00:00:00', 'Teatro Municipal, São Paulo',
          '2026-10-02 21:00:00', '2026-10-02 23:00:00', '2026-10-02 20:00:00',
          'published', 'Stand-Up'
        ),
        (
          gen_random_uuid(), 'sport', 'Flamengo vs Palmeiras – Brasileirão',
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
          '2026-09-28 00:00:00', 'Maracanã, Rio de Janeiro',
          '2026-09-28 16:00:00', '2026-09-28 18:00:00', '2026-09-28 14:30:00',
          'published', 'Football'
        ),
        (
          gen_random_uuid(), 'sport', 'UFC 310 – Main Event Night',
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
          '2026-10-18 00:00:00', 'Ginásio do Maracanãzinho, Rio de Janeiro',
          '2026-10-18 19:00:00', '2026-10-18 23:30:00', '2026-10-18 17:30:00',
          'published', 'MMA'
        ),
        (
          gen_random_uuid(), 'festival', 'Lollapalooza Brasil 2026',
          'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
          '2026-11-20 00:00:00', 'Autódromo de Interlagos, São Paulo',
          '2026-11-20 12:00:00', '2026-11-20 23:59:00', '2026-11-20 11:00:00',
          'published', 'Multi-genre'
        ),
        (
          gen_random_uuid(), 'festival', 'São Paulo Gastronômico 2026',
          'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
          '2026-10-10 00:00:00', 'Parque Ibirapuera, São Paulo',
          '2026-10-10 11:00:00', '2026-10-10 22:00:00', '2026-10-10 10:30:00',
          'published', 'Gastronomy'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "Event"
      WHERE "name" IN (
        'The Weeknd – After Hours Tour',
        'Coldplay – Music of the Spheres',
        'Cirque du Soleil – Alegría',
        'Chappell Roan – Stand-Up Special',
        'Flamengo vs Palmeiras – Brasileirão',
        'UFC 310 – Main Event Night',
        'Lollapalooza Brasil 2026',
        'São Paulo Gastronômico 2026'
      )
    `);
  }
}
