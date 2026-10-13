import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { Migration1791923400000 } from '@catalogModule/persistence/migration/1791923400000-migration';
import { Migration1791923802769 } from '@catalogModule/persistence/migration/1791923802769-migration';
import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource, QueryRunner } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// The seeded maps (1790550000000, 1790600000001) and the venues the migration
// gives them (1790697184776).
const CONCENTRIC_ARENA_ID = '11111111-1111-4111-8111-111111111111';
const FOOTBALL_STADIUM_ID = '22222222-2222-4222-8222-222222222222';
const CAESARS_PALACE_ID = 'a0000000-0000-4000-8000-000000000023';
const MARACANA_ID = 'a0000000-0000-4000-8000-000000000013';

// Every row is written and read inside one transaction that is rolled back.
// The transaction first undoes the ownership schema (Migration1791923802769),
// so the legacy shape (unowned maps shared across venues) can be written and
// never outlives the test.
describe('Seat map ownership migration (Migration1791923400000)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const caesarsPalace = venueFactory.build({ id: CAESARS_PALACE_ID });
  const maracana = venueFactory.build({ id: MARACANA_ID });
  const allianzParque = venueFactory.build({ name: 'Allianz Parque' });

  // A CatalogSeatMap row as the seeds left it, with no venue.
  const unownedSeatMap = (id: string, name: string) => ({
    ...seatMapFactory.build({ id, name }),
    venueId: null,
  });

  const concentricArena = unownedSeatMap(
    CONCENTRIC_ARENA_ID,
    'Concentric Arena',
  );
  const footballStadium = unownedSeatMap(
    FOOTBALL_STADIUM_ID,
    'Football Stadium',
  );
  const allianzMap = seatMapFactory.build({
    name: 'Allianz Parque Map',
    venueId: allianzParque.id,
  });

  // A CatalogEvent row with its seat map, which eventFactory leaves out.
  const eventAt = (venueId: string, seatMapId: string | null) => {
    const event = eventFactory.build({ venueId });
    return { ...event, id: event.id!, seatMapId };
  };

  const arenaAtCaesars = eventAt(CAESARS_PALACE_ID, CONCENTRIC_ARENA_ID);
  const arenaAtAllianz = eventAt(allianzParque.id, CONCENTRIC_ARENA_ID);
  const stadiumAtMaracana = eventAt(MARACANA_ID, FOOTBALL_STADIUM_ID);
  const stadiumAtAllianz = eventAt(allianzParque.id, FOOTBALL_STADIUM_ID);
  const allianzMapAtCaesars = eventAt(CAESARS_PALACE_ID, allianzMap.id);
  const allianzMapAtAllianz = eventAt(allianzParque.id, allianzMap.id);
  const noMapAtAllianz = eventAt(allianzParque.id, null);

  const events = [
    arenaAtCaesars,
    arenaAtAllianz,
    stadiumAtMaracana,
    stadiumAtAllianz,
    allianzMapAtCaesars,
    allianzMapAtAllianz,
    noMapAtAllianz,
  ];

  const seats = [concentricArena, footballStadium, allianzMap].flatMap(
    (seatMap) => seatFactory.buildList(3, { seatMapId: seatMap.id }),
  );
  const ticketTypes = events.map((event) =>
    ticketTypeFactory.build({ eventId: event.id }),
  );

  const insert = async (table: Tables, rows: object[]) => {
    const { sql, bindings } = testDbClient(table)
      .insert(rows)
      .toSQL()
      .toNative();
    await queryRunner.query(sql, bindings as unknown[]);
  };

  const select = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
    queryRunner.query(sql, params);

  const venueIdOf = async (seatMapId: string) =>
    (
      await select<{ venueId: string | null }>(
        `SELECT "venueId" FROM "CatalogSeatMap" WHERE id = $1`,
        [seatMapId],
      )
    )[0].venueId;

  const seatMapIdOf = async (eventId: string) =>
    (
      await select<{ seatMapId: string | null }>(
        `SELECT "seatMapId" FROM "CatalogEvent" WHERE id = $1`,
        [eventId],
      )
    )[0].seatMapId;

  const seedLegacyShape = async (extraSeatMaps: object[] = []) => {
    await insert(Tables.Venue, [caesarsPalace, maracana, allianzParque]);
    await insert(Tables.SeatMap, [
      concentricArena,
      footballStadium,
      allianzMap,
      ...extraSeatMaps,
    ]);
    await insert(Tables.Seat, seats);
    await insert(Tables.Event, events);
    await insert(Tables.TicketType, ticketTypes);
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
    await new Migration1791923802769().down(queryRunner);
    // Start from empty tables inside the transaction; the rollback restores
    // whatever the test database held.
    for (const table of [
      Tables.Seat,
      Tables.TicketType,
      Tables.EventArtist,
      Tables.Event,
      Tables.SeatMap,
    ]) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }
    await queryRunner.query(`DELETE FROM "CatalogVenue" WHERE id = ANY($1)`, [
      [CAESARS_PALACE_ID, MARACANA_ID],
    ]);
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

  it('gives Concentric Arena to Caesars Palace and Football Stadium to Maracanã (VMAP-05)', async () => {
    await seedLegacyShape();

    await new Migration1791923400000().up(queryRunner);

    expect(await venueIdOf(CONCENTRIC_ARENA_ID)).toBe(CAESARS_PALACE_ID);
    expect(await venueIdOf(FOOTBALL_STADIUM_ID)).toBe(MARACANA_ID);
    expect(await venueIdOf(allianzMap.id)).toBe(allianzParque.id);
  });

  it("unlinks every event whose venue differs from its seat map's venue (VMAP-06)", async () => {
    await seedLegacyShape();

    await new Migration1791923400000().up(queryRunner);

    expect(await seatMapIdOf(arenaAtAllianz.id)).toBeNull();
    expect(await seatMapIdOf(stadiumAtAllianz.id)).toBeNull();
    expect(await seatMapIdOf(allianzMapAtCaesars.id)).toBeNull();
  });

  it("keeps the seat map of every event at its map's venue (VMAP-07)", async () => {
    await seedLegacyShape();

    await new Migration1791923400000().up(queryRunner);

    expect(await seatMapIdOf(arenaAtCaesars.id)).toBe(CONCENTRIC_ARENA_ID);
    expect(await seatMapIdOf(stadiumAtMaracana.id)).toBe(FOOTBALL_STADIUM_ID);
    expect(await seatMapIdOf(allianzMapAtAllianz.id)).toBe(allianzMap.id);
    expect(await seatMapIdOf(noMapAtAllianz.id)).toBeNull();
  });

  it('leaves every seat and ticket type in place (VMAP-08)', async () => {
    await seedLegacyShape();

    await new Migration1791923400000().up(queryRunner);

    const storedSeats = await select<{ id: string; seatMapId: string }>(
      `SELECT id, "seatMapId" FROM "CatalogSeat" ORDER BY id`,
    );
    const storedTicketTypes = await select<{ id: string; eventId: string }>(
      `SELECT id, "eventId" FROM "CatalogTicketType" ORDER BY id`,
    );
    // Postgres orders uuids by their bytes, the same as their hex strings.
    const byId = (a: { id: string }, b: { id: string }) =>
      a.id < b.id ? -1 : 1;

    expect(storedSeats).toEqual(
      seats.map(({ id, seatMapId }) => ({ id, seatMapId })).sort(byId),
    );
    expect(storedTicketTypes).toEqual(
      ticketTypes.map(({ id, eventId }) => ({ id, eventId })).sort(byId),
    );
  });

  it('throws naming each other unowned seat map and changes no map or event (VMAP-09)', async () => {
    const orphanA = unownedSeatMap(faker.string.uuid(), 'Orphan A');
    const orphanB = unownedSeatMap(faker.string.uuid(), 'Orphan B');
    await seedLegacyShape([orphanA, orphanB]);
    const linksBefore = await select(
      `SELECT id, "seatMapId" FROM "CatalogEvent" ORDER BY id`,
    );

    const result = new Migration1791923400000().up(queryRunner);

    await expect(result).rejects.toThrow(`Orphan A (${orphanA.id})`);
    await expect(result).rejects.toThrow(`Orphan B (${orphanB.id})`);
    await expect(result).rejects.toThrow(/^Seat maps have no venue: /);
    expect(await venueIdOf(CONCENTRIC_ARENA_ID)).toBeNull();
    expect(await venueIdOf(FOOTBALL_STADIUM_ID)).toBeNull();
    expect(
      await select(`SELECT id, "seatMapId" FROM "CatalogEvent" ORDER BY id`),
    ).toEqual(linksBefore);
  });

  it('completes without changes on a database without the seeded maps (VMAP-05 edge)', async () => {
    await insert(Tables.Venue, [allianzParque]);
    await insert(Tables.SeatMap, [allianzMap]);
    await insert(Tables.Event, [allianzMapAtAllianz]);

    await new Migration1791923400000().up(queryRunner);

    expect(await venueIdOf(allianzMap.id)).toBe(allianzParque.id);
    expect(await seatMapIdOf(allianzMapAtAllianz.id)).toBe(allianzMap.id);
    expect(await select(`SELECT id FROM "CatalogSeatMap"`)).toEqual([
      { id: allianzMap.id },
    ]);
  });

  it('leaves data the ownership schema accepts (VMAP-05..07 with Migration1791923802769)', async () => {
    await seedLegacyShape();

    await new Migration1791923400000().up(queryRunner);
    await new Migration1791923802769().up(queryRunner);

    expect(
      await select(
        `SELECT conname FROM pg_constraint
          WHERE conrelid = '"CatalogEvent"'::regclass
            AND conname = 'FK_beed187020460d1eb83e3f63e54'`,
      ),
    ).toEqual([{ conname: 'FK_beed187020460d1eb83e3f63e54' }]);
  });
});
