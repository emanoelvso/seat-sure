import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { Migration1792200000000 } from '@catalogModule/persistence/migration/1792200000000-migration';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource, QueryRunner } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

// Every row is written and read inside one transaction that is rolled back,
// after the transaction emptied the tables the migration touches.
describe('Past events move to the future (Migration1792200000000)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const [venue] = venueFactory.buildList(1);

  const at = (offsetMs: number) => new Date(Date.now() + offsetMs);
  const eventAt = (
    startOffsetMs: number,
    overrides: Partial<ReturnType<typeof eventFactory.build>> = {},
  ) => {
    const startAt = at(startOffsetMs);
    return {
      ...eventFactory.build({
        venueId: venue.id,
        status: EventStatus.PUBLISHED,
        date: startAt,
        startAt,
        endsAt: new Date(startAt.getTime() + 3 * 3_600_000),
        doorsOpen: new Date(startAt.getTime() - 3_600_000),
        ...overrides,
      }),
      seatMapId: null,
    };
  };

  const past = eventAt(-30 * DAY_MS);
  const longPast = eventAt(-400 * DAY_MS);
  const upcoming = eventAt(10 * DAY_MS);
  const pastDraft = eventAt(-30 * DAY_MS, { status: EventStatus.DRAFT });

  const insert = async (table: Tables, rows: object[]) => {
    const { sql, bindings } = testDbClient(table)
      .insert(rows)
      .toSQL()
      .toNative();
    await queryRunner.query(sql, bindings as unknown[]);
  };

  const load = async (id: string) =>
    (
      await queryRunner.query(
        `SELECT "date", "startAt", "endsAt", "doorsOpen" FROM "CatalogEvent" WHERE "id" = $1`,
        [id],
      )
    )[0] as Record<'date' | 'startAt' | 'endsAt' | 'doorsOpen', Date>;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [CatalogPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    for (const table of [
      Tables.TicketTypeRowPrice,
      Tables.TicketType,
      Tables.EventArtist,
      Tables.Event,
    ]) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }
    await insert(Tables.Venue, [venue]);
    await insert(Tables.Event, [past, longPast, upcoming, pastDraft]);
    await new Migration1792200000000().up(queryRunner);
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it.each([
    ['a month old', past],
    ['over a year old', longPast],
  ])('moves an event that is %s to at least a week from now', async (_, e) => {
    const moved = await load(e.id!);
    expect(moved.startAt.getTime()).toBeGreaterThanOrEqual(
      Date.now() + WEEK_MS - 1000,
    );
    expect(moved.startAt.getTime()).toBeLessThanOrEqual(
      Date.now() + WEEK_MS + 126 * DAY_MS,
    );
  });

  it('keeps the weekday and the time of day, and the gaps between the four dates', async () => {
    const moved = await load(past.id!);

    expect((moved.startAt.getTime() - past.startAt!.getTime()) % WEEK_MS).toBe(
      0,
    );
    expect(moved.endsAt.getTime() - moved.startAt.getTime()).toBe(
      3 * 3_600_000,
    );
    expect(moved.startAt.getTime() - moved.doorsOpen.getTime()).toBe(3_600_000);
    expect(moved.date.getTime()).toBe(moved.startAt.getTime());
  });

  it('leaves upcoming and unpublished events alone', async () => {
    expect((await load(upcoming.id!)).startAt).toEqual(upcoming.startAt);
    expect((await load(pastDraft.id!)).startAt).toEqual(pastDraft.startAt);
  });
});
