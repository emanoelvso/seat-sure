import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatMapSectionViewFactory } from '@catalogModule/__test__/factory/seat-map-section-view.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { ticketTypeRowPriceFactory } from '@catalogModule/__test__/factory/ticket-type-row-price.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';
import { Migration1791941200000 } from '@catalogModule/persistence/migration/1791941200000-migration';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource, QueryRunner } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// The seeded maps (1790550000000, 1790600000001).
const CONCENTRIC_ARENA_ID = '11111111-1111-4111-8111-111111111111';
const FOOTBALL_STADIUM_ID = '22222222-2222-4222-8222-222222222222';

const { AISLE, EXTRA_LEGROOM, ACCESSIBLE } = SeatPerk;

// Every row is written and read inside one transaction that is rolled back,
// after the transaction emptied the tables the seed touches.
describe('Row premium, perk and view rating seed (Migration1791941200000)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const venues = venueFactory.buildList(3);
  const [arenaVenue, stadiumVenue, otherVenue] = venues;

  // The default layout has sections "vip" and "a"; the seed rates the
  // sections the seeded maps have, so give each map the keys it should rate.
  const mapWithSections = (id: string, venueId: string, keys: string[]) => {
    const { layout } = seatMapFactory.build();
    const base = JSON.parse(layout) as SeatMapLayout;
    const sections = keys.map((key) => ({
      ...base.sections[0],
      key,
      label: key.toUpperCase(),
    }));
    return seatMapFactory.build({
      id,
      venueId,
      layout: JSON.stringify({ ...base, sections }),
    });
  };

  const arena = mapWithSections(CONCENTRIC_ARENA_ID, arenaVenue.id, [
    'vip',
    'a',
  ]);
  // "t.gold" is rated by the seed, "mezzanine" is not.
  const stadium = mapWithSections(FOOTBALL_STADIUM_ID, stadiumVenue.id, [
    'vip',
    't.gold',
    'mezzanine',
  ]);
  const otherMap = mapWithSections(
    '33333333-3333-4333-8333-333333333333',
    otherVenue.id,
    ['vip'],
  );

  const eventOn = (venueId: string, seatMapId: string) => {
    const event = eventFactory.build({ venueId });
    return { ...event, id: event.id!, seatMapId };
  };
  const arenaEvent = eventOn(arenaVenue.id, arena.id);
  const stadiumEvent = eventOn(stadiumVenue.id, stadium.id);
  const otherEvent = eventOn(otherVenue.id, otherMap.id);

  const arenaVip = ticketTypeFactory.build({
    eventId: arenaEvent.id,
    sectionKey: 'vip',
  });
  const arenaA = ticketTypeFactory.build({
    eventId: arenaEvent.id,
    sectionKey: 'a',
  });
  const stadiumVipType = ticketTypeFactory.build({
    eventId: stadiumEvent.id,
    sectionKey: 'vip',
  });
  const otherType = ticketTypeFactory.build({
    eventId: otherEvent.id,
    sectionKey: 'vip',
  });

  // Rows 1-12 with seats 01-04 in the arena's VIP section and in the other
  // map, which the seed must leave alone.
  const seatsOf = (seatMapId: string) =>
    Array.from({ length: 12 }, (_, r) => String(r + 1)).flatMap((row) =>
      ['01', '02', '03', '04'].map((number) =>
        seatFactory.build({ seatMapId, sectionKey: 'vip', row, number }),
      ),
    );
  const arenaSeats = seatsOf(arena.id);
  const otherSeats = seatsOf(otherMap.id);

  // A premium the seed did not add: row 8 on a seeded ticket type.
  const manualPremium = ticketTypeRowPriceFactory.build({
    ticketTypeId: arenaVip.id,
    row: '8',
    premiumCents: 7000,
  });
  const otherMapPremium = ticketTypeRowPriceFactory.build({
    ticketTypeId: otherType.id,
    row: '1',
    premiumCents: 15000,
  });
  const otherMapRating = seatMapSectionViewFactory.build({
    seatMapId: otherMap.id,
    sectionKey: 'vip',
    score: 2.5,
    label: 'Obstructed',
  });

  const insert = async (table: Tables, rows: object[]) => {
    const { sql, bindings } = testDbClient(table)
      .insert(rows)
      .toSQL()
      .toNative();
    await queryRunner.query(sql, bindings as unknown[]);
  };

  const select = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
    queryRunner.query(sql, params);

  const premiums = () =>
    select<{ ticketTypeId: string; row: string; premiumCents: number }>(
      `SELECT "ticketTypeId", "row", "premiumCents" FROM "CatalogTicketTypeRowPrice"
        ORDER BY "ticketTypeId", "row"`,
    );

  const perksOf = async (seatMapId: string, row: string, number: string) =>
    (
      await select<{ perks: string[] }>(
        `SELECT "perks" FROM "CatalogSeat"
          WHERE "seatMapId" = $1 AND "sectionKey" = 'vip' AND "row" = $2 AND "number" = $3`,
        [seatMapId, row, number],
      )
    )[0].perks;

  const ratings = () =>
    select<{
      seatMapId: string;
      sectionKey: string;
      score: string;
      label: string;
    }>(
      `SELECT "seatMapId", "sectionKey", "score", "label" FROM "CatalogSeatMapSectionView"
        ORDER BY "seatMapId", "sectionKey"`,
    );

  const sortedBy = <T extends { ticketTypeId: string; row: string }>(
    rows: T[],
  ) =>
    [...rows].sort((a, b) =>
      `${a.ticketTypeId}${a.row}`.localeCompare(`${b.ticketTypeId}${b.row}`),
    );

  const seedFixtures = async () => {
    await insert(Tables.Venue, venues);
    await insert(Tables.SeatMap, [arena, stadium, otherMap]);
    await insert(Tables.Seat, [...arenaSeats, ...otherSeats]);
    await insert(Tables.Event, [arenaEvent, stadiumEvent, otherEvent]);
    await insert(Tables.TicketType, [
      arenaVip,
      arenaA,
      stadiumVipType,
      otherType,
    ]);
    await insert(Tables.TicketTypeRowPrice, [manualPremium, otherMapPremium]);
    await insert(Tables.SeatMapSectionView, [otherMapRating]);
  };

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
      Tables.SeatMapSectionView,
      Tables.Seat,
      Tables.TicketType,
      Tables.EventArtist,
      Tables.Event,
      Tables.SeatMap,
    ]) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }
    await seedFixtures();
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

  it('adds a 15000 premium to rows 1-3 of every ticket type on the seeded maps only', async () => {
    await new Migration1791941200000().up(queryRunner);

    const seeded = [arenaVip, arenaA, stadiumVipType].flatMap(({ id }) =>
      ['1', '2', '3'].map((row) => ({
        ticketTypeId: id,
        row,
        premiumCents: 15000,
      })),
    );
    expect(await premiums()).toEqual(
      sortedBy([
        ...seeded,
        {
          ticketTypeId: manualPremium.ticketTypeId,
          row: '8',
          premiumCents: 7000,
        },
        {
          ticketTypeId: otherMapPremium.ticketTypeId,
          row: '1',
          premiumCents: 15000,
        },
      ]),
    );
  });

  it('puts the aisle on the first and last seat of each row', async () => {
    await new Migration1791941200000().up(queryRunner);

    expect(await perksOf(arena.id, '1', '01')).toEqual([AISLE]);
    expect(await perksOf(arena.id, '1', '04')).toEqual([AISLE]);
    expect(await perksOf(arena.id, '9', '01')).toEqual([AISLE]);
    expect(await perksOf(arena.id, '9', '04')).toEqual([AISLE]);
    expect(await perksOf(arena.id, '1', '02')).toEqual([]);
    expect(await perksOf(arena.id, '9', '03')).toEqual([]);
  });

  it('gives every seat of row 5 extra legroom, and the aisle seats of row 5 both perks', async () => {
    await new Migration1791941200000().up(queryRunner);

    expect(await perksOf(arena.id, '5', '01')).toEqual([AISLE, EXTRA_LEGROOM]);
    expect(await perksOf(arena.id, '5', '02')).toEqual([EXTRA_LEGROOM]);
    expect(await perksOf(arena.id, '5', '03')).toEqual([EXTRA_LEGROOM]);
    expect(await perksOf(arena.id, '5', '04')).toEqual([AISLE, EXTRA_LEGROOM]);
  });

  it('makes seats 01 and 02 of row 12 accessible and leaves the rest of row 12 without it', async () => {
    await new Migration1791941200000().up(queryRunner);

    expect(await perksOf(arena.id, '12', '01')).toEqual([AISLE, ACCESSIBLE]);
    expect(await perksOf(arena.id, '12', '02')).toEqual([ACCESSIBLE]);
    expect(await perksOf(arena.id, '12', '03')).toEqual([]);
    expect(await perksOf(arena.id, '12', '04')).toEqual([AISLE]);
  });

  it('leaves the seats of other seat maps without perks', async () => {
    await new Migration1791941200000().up(queryRunner);

    const withPerks = await select(
      `SELECT 1 FROM "CatalogSeat" WHERE "seatMapId" = $1 AND cardinality("perks") > 0`,
      [otherMap.id],
    );
    expect(withPerks).toEqual([]);
  });

  it('rates the arena VIP section 4.7 "Clear View" and every other section of the seeded maps', async () => {
    await new Migration1791941200000().up(queryRunner);

    const seeded = (await ratings()).filter(
      ({ seatMapId }) => seatMapId !== otherMap.id,
    );
    expect(seeded).toEqual([
      {
        seatMapId: CONCENTRIC_ARENA_ID,
        sectionKey: 'a',
        score: '4.2',
        label: 'Good Angle',
      },
      {
        seatMapId: CONCENTRIC_ARENA_ID,
        sectionKey: 'vip',
        score: '4.7',
        label: 'Clear View',
      },
      {
        seatMapId: FOOTBALL_STADIUM_ID,
        sectionKey: 't.gold',
        score: '4.4',
        label: 'Central View',
      },
      {
        seatMapId: FOOTBALL_STADIUM_ID,
        sectionKey: 'vip',
        score: '4.6',
        label: 'Pitch-side View',
      },
    ]);
  });

  it('keeps every seeded score between 3.2 and 4.7 and rates only sections the map has', async () => {
    await new Migration1791941200000().up(queryRunner);

    const scores = (await ratings())
      .filter(({ seatMapId }) => seatMapId !== otherMap.id)
      .map(({ score }) => Number(score));
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(3.2);
    expect(Math.max(...scores)).toBeLessThanOrEqual(4.7);
  });

  it('down() removes the seeded premiums, perks and ratings and nothing else', async () => {
    await new Migration1791941200000().up(queryRunner);

    await new Migration1791941200000().down(queryRunner);

    expect(await premiums()).toEqual(
      sortedBy([
        {
          ticketTypeId: manualPremium.ticketTypeId,
          row: '8',
          premiumCents: 7000,
        },
        {
          ticketTypeId: otherMapPremium.ticketTypeId,
          row: '1',
          premiumCents: 15000,
        },
      ]),
    );
    expect(
      await select(
        `SELECT 1 FROM "CatalogSeat" WHERE cardinality("perks") > 0`,
      ),
    ).toEqual([]);
    expect(await ratings()).toEqual([
      {
        seatMapId: otherMap.id,
        sectionKey: 'vip',
        score: '2.5',
        label: 'Obstructed',
      },
    ]);
  });

  it('completes without changes on a database without the seeded maps', async () => {
    await queryRunner.query(`DELETE FROM "CatalogSeatMapSectionView"`);
    await queryRunner.query(`DELETE FROM "CatalogTicketTypeRowPrice"`);
    await queryRunner.query(`DELETE FROM "CatalogSeat"`);
    await queryRunner.query(`DELETE FROM "CatalogTicketType"`);
    await queryRunner.query(`DELETE FROM "CatalogEvent"`);
    await queryRunner.query(`DELETE FROM "CatalogSeatMap"`);

    await new Migration1791941200000().up(queryRunner);

    expect(await premiums()).toEqual([]);
    expect(await ratings()).toEqual([]);
  });
});
