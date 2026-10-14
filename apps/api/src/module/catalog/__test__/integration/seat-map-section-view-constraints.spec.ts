import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatMapSectionViewFactory } from '@catalogModule/__test__/factory/seat-map-section-view.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';

// Postgres SQLSTATE codes
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const STRING_DATA_RIGHT_TRUNCATION = '22001';

describe('CatalogSeatMapSectionView constraints (integration)', () => {
  const venue = venueFactory.build();
  const seatMap = seatMapFactory.build({ venueId: venue.id });

  const insertView = (overrides: {
    sectionKey?: string;
    score?: number;
    label?: string;
  }) =>
    testDbClient(Tables.SeatMapSectionView).insert(
      seatMapSectionViewFactory.build({ seatMapId: seatMap.id, ...overrides }),
    );

  const viewsOfSeatMap = () =>
    testDbClient(Tables.SeatMapSectionView).where({ seatMapId: seatMap.id });

  beforeAll(async () => {
    await testDbClient.batchInsert(Tables.Venue, [venue]);
  });

  beforeEach(async () => {
    await testDbClient(Tables.SeatMap).where({ id: seatMap.id }).del();
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
  });

  afterAll(async () => {
    await testDbClient(Tables.SeatMap).where({ id: seatMap.id }).del();
    await testDbClient(Tables.Venue).where({ id: venue.id }).del();
    await testDbClient.destroy();
  });

  it.each([
    [0, '0.0'],
    [5, '5.0'],
    [4.7, '4.7'],
  ])('accepts a score of %s (VIEW-02)', async (score, stored) => {
    await insertView({ score });

    expect(await viewsOfSeatMap().select('score')).toEqual([{ score: stored }]);
  });

  it.each([5.1, -0.1])('rejects a score of %s (VIEW-02)', async (score) => {
    await expect(insertView({ score })).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    });
    expect(await viewsOfSeatMap()).toEqual([]);
  });

  it.each(['', '   '])(
    'rejects the blank label %j (VIEW-02)',
    async (label) => {
      await expect(insertView({ label })).rejects.toMatchObject({
        code: CHECK_VIOLATION,
      });
      expect(await viewsOfSeatMap()).toEqual([]);
    },
  );

  it('accepts a 30-character label and rejects a 31-character one (VIEW-02)', async () => {
    await insertView({ sectionKey: 'a', label: 'x'.repeat(30) });

    await expect(
      insertView({ sectionKey: 'b', label: 'x'.repeat(31) }),
    ).rejects.toMatchObject({ code: STRING_DATA_RIGHT_TRUNCATION });
    expect(await viewsOfSeatMap().select('sectionKey')).toEqual([
      { sectionKey: 'a' },
    ]);
  });

  it('rejects a second rating for the same seat map section', async () => {
    await insertView({ sectionKey: 'vip' });

    await expect(insertView({ sectionKey: 'vip' })).rejects.toMatchObject({
      code: UNIQUE_VIOLATION,
    });
    expect(await viewsOfSeatMap()).toHaveLength(1);
  });

  it("deletes a seat map's ratings with the seat map", async () => {
    await insertView({ sectionKey: 'vip' });
    await insertView({ sectionKey: 'a' });

    await testDbClient(Tables.SeatMap).where({ id: seatMap.id }).del();

    expect(await viewsOfSeatMap()).toEqual([]);
  });
});
