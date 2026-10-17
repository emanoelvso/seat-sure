import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatMapSectionViewFactory } from '@catalogModule/__test__/factory/seat-map-section-view.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { Migration1792100000000 } from '@catalogModule/persistence/migration/1792100000000-migration';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource, QueryRunner } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// The seeded layouts (1790550000000, 1790600000001) the migration copies.
const ARENA_ID = '11111111-1111-4111-8111-111111111111';
const STADIUM_ID = '22222222-2222-4222-8222-222222222222';

const ARENA_SECTIONS = ['vip', 'a', 'b', 'c'];
const STADIUM_SECTIONS = [
  'vip',
  't.gold',
  'b.gold',
  't.bronz',
  'b.bronz',
  'l.bronz',
  'r.bronz',
  't.standard',
  'b.standard',
];

// Every row is written and read inside one transaction that is rolled back,
// after the transaction emptied the tables the migration touches.
describe('Every published event has a seat map (Migration1792100000000)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const [templateVenue, venueC, venueD] = venueFactory.buildList(3);

  const arena = seatMapFactory.build({
    id: ARENA_ID,
    venueId: templateVenue.id,
  });
  const stadium = seatMapFactory.build({
    id: STADIUM_ID,
    venueId: templateVenue.id,
  });

  const event = (
    venueId: string,
    overrides: Partial<ReturnType<typeof eventFactory.build>>,
  ) => {
    const built = eventFactory.build({
      venueId,
      status: EventStatus.PUBLISHED,
      category: 'Pop',
      ...overrides,
    });
    return { ...built, id: built.id!, seatMapId: null };
  };

  const concertAtC = event(venueC.id, { type: EventType.CONCERT });
  const showAtC = event(venueC.id, { type: EventType.SHOW });
  const footballAtC = event(venueC.id, {
    type: EventType.SPORT,
    category: 'Football',
  });
  const basketballAtD = event(venueD.id, {
    type: EventType.SPORT,
    category: 'Basketball',
  });
  const draftAtD = event(venueD.id, {
    type: EventType.CONCERT,
    status: EventStatus.DRAFT,
  });
  // Lost its map in 1791923400000 but kept ticket types of the arena layout.
  const keptTypes = event(venueD.id, { type: EventType.CONCERT });
  const keptType = ticketTypeFactory.build({
    eventId: keptTypes.id,
    sectionKey: 'vip',
    priceCents: 12345,
  });
  // Ticket types for a section no seeded layout has.
  const foreignTypes = event(venueD.id, { type: EventType.FESTIVAL });
  const foreignType = ticketTypeFactory.build({
    eventId: foreignTypes.id,
    sectionKey: 'custom',
  });
  const mapped = {
    ...event(templateVenue.id, { type: EventType.CONCERT }),
    seatMapId: ARENA_ID,
  };

  const templateSeats = [
    ...ARENA_SECTIONS.flatMap((sectionKey) =>
      [1, 2].map((n) =>
        seatFactory.build({
          seatMapId: ARENA_ID,
          sectionKey,
          row: String(n),
          number: '01',
          perks: n === 1 ? [SeatPerk.AISLE] : [],
        }),
      ),
    ),
    ...STADIUM_SECTIONS.map((sectionKey) =>
      seatFactory.build({
        seatMapId: STADIUM_ID,
        sectionKey,
        row: '1',
        number: '01',
      }),
    ),
  ];
  const templateViews = [
    seatMapSectionViewFactory.build({
      seatMapId: ARENA_ID,
      sectionKey: 'vip',
      score: 4.7,
      label: 'Clear View',
    }),
    seatMapSectionViewFactory.build({
      seatMapId: STADIUM_ID,
      sectionKey: 'vip',
      score: 4.6,
      label: 'Pitch-side View',
    }),
  ];

  const insert = async (table: Tables, rows: object[]) => {
    const { sql, bindings } = testDbClient(table)
      .insert(rows)
      .toSQL()
      .toNative();
    await queryRunner.query(sql, bindings as unknown[]);
  };

  const select = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
    queryRunner.query(sql, params);

  const mapOf = async (eventId: string) =>
    (
      await select<{ seatMapId: string | null; mapVenueId: string | null }>(
        `SELECT e."seatMapId", m."venueId" AS "mapVenueId"
           FROM "CatalogEvent" e
           LEFT JOIN "CatalogSeatMap" m ON m."id" = e."seatMapId"
          WHERE e."id" = $1`,
        [eventId],
      )
    )[0];

  const sectionsOf = async (eventId: string) =>
    (
      await select<{ sectionKey: string }>(
        `SELECT "sectionKey" FROM "CatalogTicketType" WHERE "eventId" = $1
          ORDER BY "sectionKey"`,
        [eventId],
      )
    ).map(({ sectionKey }) => sectionKey);

  const count = async (sql: string, params: unknown[] = []) =>
    Number((await select<{ n: string }>(sql, params))[0].n);

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
    await insert(Tables.Venue, [templateVenue, venueC, venueD]);
    await insert(Tables.SeatMap, [arena, stadium]);
    await insert(Tables.Seat, templateSeats);
    await insert(Tables.SeatMapSectionView, templateViews);
    await insert(Tables.Event, [
      mapped,
      concertAtC,
      showAtC,
      footballAtC,
      basketballAtD,
      draftAtD,
      keptTypes,
      foreignTypes,
    ]);
    await insert(Tables.TicketType, [keptType, foreignType]);
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

  it('gives each published event without a map one owned by its own venue', async () => {
    await new Migration1792100000000().up(queryRunner);

    for (const { id, venueId } of [
      concertAtC,
      showAtC,
      footballAtC,
      basketballAtD,
    ]) {
      const { seatMapId, mapVenueId } = await mapOf(id);
      expect(seatMapId).not.toBeNull();
      expect(mapVenueId).toBe(venueId);
    }
  });

  it("shares one map between a venue's events of the same layout and splits football off", async () => {
    await new Migration1792100000000().up(queryRunner);

    const concert = await mapOf(concertAtC.id);
    expect((await mapOf(showAtC.id)).seatMapId).toBe(concert.seatMapId);
    const football = await mapOf(footballAtC.id);
    expect(football.seatMapId).not.toBe(concert.seatMapId);
    expect(
      await count(
        `SELECT count(*) AS n FROM "CatalogSeatMap" WHERE "venueId" = $1`,
        [venueC.id],
      ),
    ).toBe(2);
  });

  it('copies the arena layout for non-football events and the stadium layout for football', async () => {
    await new Migration1792100000000().up(queryRunner);

    expect(await sectionsOf(concertAtC.id)).toEqual([...ARENA_SECTIONS].sort());
    expect(await sectionsOf(basketballAtD.id)).toEqual(
      [...ARENA_SECTIONS].sort(),
    );
    expect(await sectionsOf(footballAtC.id)).toEqual(
      [...STADIUM_SECTIONS].sort(),
    );
    const [{ same }] = await select<{ same: boolean }>(
      `SELECT m."layout" = t."layout" AS "same"
         FROM "CatalogEvent" e
         JOIN "CatalogSeatMap" m ON m."id" = e."seatMapId"
         JOIN "CatalogSeatMap" t ON t."id" = $2
        WHERE e."id" = $1`,
      [footballAtC.id, STADIUM_ID],
    );
    expect(same).toBe(true);
  });

  it('copies the seats with their perks and the section ratings into the new map', async () => {
    await new Migration1792100000000().up(queryRunner);

    const { seatMapId } = await mapOf(concertAtC.id);
    expect(
      await count(
        `SELECT count(*) AS n FROM "CatalogSeat" WHERE "seatMapId" = $1`,
        [seatMapId],
      ),
    ).toBe(ARENA_SECTIONS.length * 2);
    expect(
      await count(
        `SELECT count(*) AS n FROM "CatalogSeat"
          WHERE "seatMapId" = $1 AND "row" = '1' AND "perks" = ARRAY['AISLE']::text[]`,
        [seatMapId],
      ),
    ).toBe(ARENA_SECTIONS.length);
    expect(
      await select(
        `SELECT "sectionKey", "score", "label" FROM "CatalogSeatMapSectionView"
          WHERE "seatMapId" = $1`,
        [seatMapId],
      ),
    ).toEqual([{ sectionKey: 'vip', score: '4.7', label: 'Clear View' }]);
  });

  it('prices the new ticket types like the seeded events: fees, front-row premium', async () => {
    await new Migration1792100000000().up(queryRunner);

    const [vip] = await select<{
      id: string;
      priceCents: number;
      serviceFeeCents: number;
      taxCents: number;
    }>(
      `SELECT "id", "priceCents", "serviceFeeCents", "taxCents"
         FROM "CatalogTicketType" WHERE "eventId" = $1 AND "sectionKey" = 'vip'`,
      [concertAtC.id],
    );
    expect(vip).toMatchObject({
      priceCents: 45000,
      serviceFeeCents: 6750,
      taxCents: 3600,
    });
    expect(
      await select(
        `SELECT "row", "premiumCents" FROM "CatalogTicketTypeRowPrice"
          WHERE "ticketTypeId" = $1 ORDER BY "row"`,
        [vip.id],
      ),
    ).toEqual(['1', '2', '3'].map((row) => ({ row, premiumCents: 15000 })));
  });

  it('keeps the ticket types an event already has and adds the front-row premium to them', async () => {
    await new Migration1792100000000().up(queryRunner);

    expect((await mapOf(keptTypes.id)).mapVenueId).toBe(venueD.id);
    expect(await sectionsOf(keptTypes.id)).toEqual(['vip']);
    expect(
      await select(
        `SELECT "priceCents" FROM "CatalogTicketType" WHERE "id" = $1`,
        [keptType.id],
      ),
    ).toEqual([{ priceCents: 12345 }]);
    expect(
      await count(
        `SELECT count(*) AS n FROM "CatalogTicketTypeRowPrice"
          WHERE "ticketTypeId" = $1 AND "premiumCents" = 15000`,
        [keptType.id],
      ),
    ).toBe(3);
  });

  it('leaves mapped, draft and foreign-section events alone', async () => {
    await new Migration1792100000000().up(queryRunner);

    expect((await mapOf(mapped.id)).seatMapId).toBe(ARENA_ID);
    expect((await mapOf(draftAtD.id)).seatMapId).toBeNull();
    expect((await mapOf(foreignTypes.id)).seatMapId).toBeNull();
    expect(await sectionsOf(foreignTypes.id)).toEqual(['custom']);
    expect(await sectionsOf(draftAtD.id)).toEqual([]);
  });

  it('down() unmaps the events, drops the copies and premiums and keeps every ticket type', async () => {
    await new Migration1792100000000().up(queryRunner);
    await new Migration1792100000000().down(queryRunner);

    for (const { id } of [concertAtC, showAtC, footballAtC, basketballAtD]) {
      expect((await mapOf(id)).seatMapId).toBeNull();
      expect(await sectionsOf(id)).not.toEqual([]);
    }
    expect((await mapOf(mapped.id)).seatMapId).toBe(ARENA_ID);
    expect(await sectionsOf(foreignTypes.id)).toEqual(['custom']);
    expect((await mapOf(keptTypes.id)).seatMapId).toBeNull();
    expect(await sectionsOf(keptTypes.id)).toEqual(['vip']);
    expect(
      await count(`SELECT count(*) AS n FROM "CatalogTicketTypeRowPrice"`),
    ).toBe(0);
    expect(await count(`SELECT count(*) AS n FROM "CatalogSeatMap"`)).toBe(2);
    expect(await count(`SELECT count(*) AS n FROM "CatalogSeat"`)).toBe(
      templateSeats.length,
    );
  });
});
