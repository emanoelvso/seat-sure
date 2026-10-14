import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { ticketTypeRowPriceFactory } from '@catalogModule/__test__/factory/ticket-type-row-price.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';

// Postgres SQLSTATE codes
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const INVALID_TEXT_REPRESENTATION = '22P02';

describe('CatalogTicketTypeRowPrice constraints (integration)', () => {
  const venue = venueFactory.build();
  const event = eventFactory.build({ venueId: venue.id });
  const ticketType = ticketTypeFactory.build({ eventId: event.id });

  const insertPremium = (overrides: {
    row?: string;
    // A string stands for a bound parameter Postgres must reject
    premiumCents?: number | string;
  }) =>
    testDbClient(Tables.TicketTypeRowPrice).insert({
      ...ticketTypeRowPriceFactory.build({ ticketTypeId: ticketType.id }),
      ...overrides,
    });

  const premiumsOfTicketType = () =>
    testDbClient(Tables.TicketTypeRowPrice).where({
      ticketTypeId: ticketType.id,
    });

  beforeAll(async () => {
    await testDbClient.batchInsert(Tables.Venue, [venue]);
    await testDbClient.batchInsert(Tables.Event, [event]);
  });

  beforeEach(async () => {
    await testDbClient(Tables.TicketTypeRowPrice)
      .where({ ticketTypeId: ticketType.id })
      .del();
    await testDbClient(Tables.TicketType).where({ id: ticketType.id }).del();
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);
  });

  afterAll(async () => {
    await testDbClient(Tables.TicketType).where({ id: ticketType.id }).del();
    await testDbClient(Tables.Event).where({ id: event.id }).del();
    await testDbClient(Tables.Venue).where({ id: venue.id }).del();
    await testDbClient.destroy();
  });

  it.each([0, 15000])(
    'accepts a premium of %d cents (PRICE-02)',
    async (premiumCents) => {
      await insertPremium({ row: '1', premiumCents });

      expect(
        await premiumsOfTicketType().select('row', 'premiumCents'),
      ).toEqual([{ row: '1', premiumCents }]);
    },
  );

  it('rejects a negative premium (PRICE-02)', async () => {
    await expect(
      insertPremium({ row: '1', premiumCents: -1 }),
    ).rejects.toMatchObject({ code: CHECK_VIOLATION });
    expect(await premiumsOfTicketType()).toEqual([]);
  });

  it('rejects a fractional premium (PRICE-02)', async () => {
    await expect(
      insertPremium({ row: '1', premiumCents: '1.5' }),
    ).rejects.toMatchObject({ code: INVALID_TEXT_REPRESENTATION });
    expect(await premiumsOfTicketType()).toEqual([]);
  });

  it('rejects a second premium for the same ticket type and row', async () => {
    await insertPremium({ row: '1', premiumCents: 100 });

    await expect(
      insertPremium({ row: '1', premiumCents: 200 }),
    ).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
    expect(await premiumsOfTicketType()).toHaveLength(1);
  });

  it.each(['', '   '])('rejects a blank row %j', async (row) => {
    await expect(insertPremium({ row })).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    });
    expect(await premiumsOfTicketType()).toEqual([]);
  });

  it("deletes a ticket type's premiums with the ticket type", async () => {
    await insertPremium({ row: '1' });
    await insertPremium({ row: '2' });

    await testDbClient(Tables.TicketType).where({ id: ticketType.id }).del();

    expect(await premiumsOfTicketType()).toEqual([]);
  });
});
