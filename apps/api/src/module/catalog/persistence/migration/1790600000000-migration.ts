import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1790600000000 implements MigrationInterface {
  name = 'Migration1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "SeatMap" sm
      SET "layout" = jsonb_build_object(
        'viewBox', sm."layout"->'viewBox',
        'labelStyle', jsonb_build_object('size', 24, 'weight', 700),
        'stage', jsonb_build_object(
          'label', sm."layout"->'stage'->'label',
          'labelAt', sm."layout"->'stage'->'labelAt',
          'shapes', jsonb_build_array(
            jsonb_build_object(
              'path', sm."layout"->'stage'->'path',
              'color', '#999999'
            )
          )
        ),
        'sections', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'key', s.section->'key',
                'label', s.section->'label',
                'color', s.section->'color',
                'shapes', jsonb_build_array(
                  jsonb_build_object(
                    'path', s.section->'path',
                    'labelAt', s.section->'labelAt',
                    'labelRotation', 0
                  )
                )
              )
              ORDER BY s.position
            )
            FROM jsonb_array_elements(sm."layout"->'sections')
              WITH ORDINALITY AS s(section, position)
          ),
          '[]'::jsonb
        )
      )
      WHERE sm."layout"->'labelStyle' IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "SeatMap" sm
      SET "layout" = jsonb_build_object(
        'viewBox', sm."layout"->'viewBox',
        'stage', jsonb_build_object(
          'label', sm."layout"->'stage'->'label',
          'path', sm."layout"->'stage'->'shapes'->0->'path',
          'labelAt', sm."layout"->'stage'->'labelAt'
        ),
        'sections', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'key', s.section->'key',
                'label', s.section->'label',
                'path', s.section->'shapes'->0->'path',
                'color', s.section->'color',
                'labelAt', s.section->'shapes'->0->'labelAt'
              )
              ORDER BY s.position
            )
            FROM jsonb_array_elements(sm."layout"->'sections')
              WITH ORDINALITY AS s(section, position)
          ),
          '[]'::jsonb
        )
      )
      WHERE sm."layout"->'labelStyle' IS NOT NULL
    `);
  }
}
