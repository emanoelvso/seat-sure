import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';

// Postgres SQLSTATE codes
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

describe('CatalogSeat constraints (integration)', () => {
  const venue = venueFactory.build();
  const seatMap = seatMapFactory.build({ venueId: venue.id });

  const insertSeat = (overrides: Parameters<typeof seatFactory.build>[0]) =>
    testDbClient(Tables.Seat).insert(
      seatFactory.build({ seatMapId: seatMap.id, ...overrides }),
    );

  beforeAll(async () => {
    await testDbClient.batchInsert(Tables.Venue, [venue]);
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
  });

  beforeEach(async () => {
    await testDbClient(Tables.Seat).where('seatMapId', seatMap.id).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.Seat).where('seatMapId', seatMap.id).del();
    await testDbClient(Tables.SeatMap).where('id', seatMap.id).del();
    await testDbClient(Tables.Venue).where('id', venue.id).del();
    await testDbClient.destroy();
  });

  it('rejects a second seat with the same map, section, row and number (VMAP-17)', async () => {
    const seat = { sectionKey: 'vip', row: '7', number: '07' };
    await insertSeat(seat);

    await expect(insertSeat(seat)).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    });
    expect(
      await testDbClient(Tables.Seat).where({ seatMapId: seatMap.id }),
    ).toHaveLength(1);
  });

  it.each([
    ['row', ''],
    ['row', '   '],
    ['number', ''],
    ['number', '   '],
    ['sectionKey', ''],
    ['sectionKey', '   '],
  ])('rejects a seat whose %s is %j (VMAP-20)', async (column, value) => {
    await expect(insertSeat({ [column]: value })).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    });
    expect(
      await testDbClient(Tables.Seat).where({ seatMapId: seatMap.id }),
    ).toEqual([]);
  });

  it.each([
    ['x', { x: -0.5, y: 10 }],
    ['y', { x: 10, y: -0.5 }],
  ])('rejects a seat with a negative %s (VMAP-21)', async (_, position) => {
    await expect(insertSeat(position)).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    });
    expect(
      await testDbClient(Tables.Seat).where({ seatMapId: seatMap.id }),
    ).toEqual([]);
  });

  it('stores a seat at position (0, 0) with labels (VMAP-21 boundary)', async () => {
    await insertSeat({ sectionKey: 'a', row: '1', number: '01', x: 0, y: 0 });

    expect(
      await testDbClient(Tables.Seat)
        .where({ seatMapId: seatMap.id })
        .select('sectionKey', 'row', 'number', 'x', 'y'),
    ).toEqual([{ sectionKey: 'a', row: '1', number: '01', x: 0, y: 0 }]);
  });

  it('reads a seat written without perks as an empty list (PERK-01)', async () => {
    const seatWithoutPerks: Partial<ReturnType<typeof seatFactory.build>> =
      seatFactory.build({ seatMapId: seatMap.id });
    delete seatWithoutPerks.perks;
    await testDbClient(Tables.Seat).insert(seatWithoutPerks);

    expect(
      await testDbClient(Tables.Seat)
        .where({ seatMapId: seatMap.id })
        .select('perks'),
    ).toEqual([{ perks: [] }]);
  });

  it('stores a seat with several perks (PERK-02)', async () => {
    await insertSeat({ perks: ['AISLE', 'ACCESSIBLE'] as SeatPerk[] });

    expect(
      await testDbClient(Tables.Seat)
        .where({ seatMapId: seatMap.id })
        .select('perks'),
    ).toEqual([{ perks: ['AISLE', 'ACCESSIBLE'] }]);
  });

  it.each([[['WINDOW']], [['AISLE', 'WINDOW']]])(
    'rejects a seat with the unknown perk list %j (PERK-02)',
    async (perks) => {
      await expect(
        insertSeat({ perks: perks as SeatPerk[] }),
      ).rejects.toMatchObject({ code: CHECK_VIOLATION });
      expect(
        await testDbClient(Tables.Seat).where({ seatMapId: seatMap.id }),
      ).toEqual([]);
    },
  );
});
