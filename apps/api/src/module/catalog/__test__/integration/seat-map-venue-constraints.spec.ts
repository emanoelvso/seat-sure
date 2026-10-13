import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';

// Postgres SQLSTATE codes
const NOT_NULL_VIOLATION = '23502';
const FOREIGN_KEY_VIOLATION = '23503';

describe('CatalogSeatMap venue ownership constraints (integration)', () => {
  const allianzParque = venueFactory.build({ name: 'Allianz Parque' });
  const theO2Arena = venueFactory.build({ name: 'The O2 Arena' });
  const allianzMap = seatMapFactory.build({ venueId: allianzParque.id });

  const eventAt = (venueId: string, seatMapId: string | null) => ({
    ...eventFactory.build({ venueId }),
    seatMapId,
  });

  const deleteRows = async () => {
    await testDbClient(Tables.Event)
      .whereIn('venueId', [allianzParque.id, theO2Arena.id])
      .del();
    await testDbClient(Tables.SeatMap)
      .whereIn('venueId', [allianzParque.id, theO2Arena.id])
      .del();
  };

  beforeAll(async () => {
    await testDbClient.batchInsert(Tables.Venue, [allianzParque, theO2Arena]);
  });

  beforeEach(async () => {
    await deleteRows();
    await testDbClient.batchInsert(Tables.SeatMap, [allianzMap]);
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient(Tables.Venue)
      .whereIn('id', [allianzParque.id, theO2Arena.id])
      .del();
    await testDbClient.destroy();
  });

  it('rejects a seat map without a venue (VMAP-01)', async () => {
    const unowned = seatMapFactory.build({ venueId: null as never });

    await expect(
      testDbClient(Tables.SeatMap).insert(unowned),
    ).rejects.toMatchObject({ code: NOT_NULL_VIOLATION, column: 'venueId' });
    expect(await testDbClient(Tables.SeatMap).where('id', unowned.id)).toEqual(
      [],
    );
  });

  it("rejects an event that uses another venue's seat map (VMAP-02)", async () => {
    const event = eventAt(theO2Arena.id, allianzMap.id);

    await expect(
      testDbClient(Tables.Event).insert(event),
    ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    expect(await testDbClient(Tables.Event).where('id', event.id)).toEqual([]);
  });

  it("rejects moving an event to another venue's seat map (VMAP-02 on update)", async () => {
    const event = eventAt(theO2Arena.id, null);
    await testDbClient(Tables.Event).insert(event);

    await expect(
      testDbClient(Tables.Event)
        .where('id', event.id)
        .update({ seatMapId: allianzMap.id }),
    ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    expect(
      await testDbClient(Tables.Event).where('id', event.id).first(),
    ).toMatchObject({ venueId: theO2Arena.id, seatMapId: null });
  });

  it("rejects moving an event to another venue while it keeps the old venue's map (VMAP-02 on update)", async () => {
    const event = eventAt(allianzParque.id, allianzMap.id);
    await testDbClient(Tables.Event).insert(event);

    await expect(
      testDbClient(Tables.Event)
        .where('id', event.id)
        .update({ venueId: theO2Arena.id }),
    ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    expect(
      await testDbClient(Tables.Event).where('id', event.id).first(),
    ).toMatchObject({ venueId: allianzParque.id, seatMapId: allianzMap.id });
  });

  it("stores an event that uses its own venue's seat map (VMAP-02 counterpart)", async () => {
    const event = eventAt(allianzParque.id, allianzMap.id);

    await testDbClient(Tables.Event).insert(event);

    expect(
      await testDbClient(Tables.Event).where('id', event.id).first(),
    ).toMatchObject({ venueId: allianzParque.id, seatMapId: allianzMap.id });
  });

  it.each([
    ['the seat map owner', () => allianzParque.id],
    ['another venue', () => theO2Arena.id],
  ])(
    'stores an event without a seat map at %s (VMAP-03)',
    async (_, venueId) => {
      const event = eventAt(venueId(), null);

      await testDbClient(Tables.Event).insert(event);

      expect(
        await testDbClient(Tables.Event).where('id', event.id).first(),
      ).toMatchObject({ venueId: venueId(), seatMapId: null });
    },
  );

  it('rejects deleting a seat map an event uses (VMAP-04)', async () => {
    const event = eventAt(allianzParque.id, allianzMap.id);
    await testDbClient(Tables.Event).insert(event);

    await expect(
      testDbClient(Tables.SeatMap).where('id', allianzMap.id).del(),
    ).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
    expect(
      await testDbClient(Tables.Event).where('id', event.id).first(),
    ).toMatchObject({ seatMapId: allianzMap.id });
    expect(
      await testDbClient(Tables.SeatMap).where('id', allianzMap.id),
    ).toHaveLength(1);
  });
});
