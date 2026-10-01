import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { CatalogModule } from '@catalogModule/catalog.module';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

describe('CatalogResolver findTicketTypeSeats (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  const venue = venueFactory.build({ country: 'Brazil' });

  const EMPTY = { event: null, ticketType: null, seatMap: null, seats: [] };

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3_600_000);

  const deleteRows = async () => {
    await testDbClient(Tables.Seat).del();
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    await testDbClient.batchInsert(Tables.Venue, [venue]);
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient(Tables.Venue).where('id', venue.id).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  const findTicketTypeSeats = async (eventId: string, ticketTypeId: string) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query FindTicketTypeSeats($FindTicketTypeSeatsInput: FindTicketTypeSeatsInput!) {
            findTicketTypeSeats(FindTicketTypeSeatsInput: $FindTicketTypeSeatsInput) {
              event {
                id
                name
              }
              ticketType {
                id
                sectionKey
                name
                priceCents
                currency
                seatsAvailable
                maxPerOrder
                tags
              }
              seatMap {
                id
                name
              }
              seats {
                id
                row
                number
                x
                y
              }
            }
          }
        `,
        variables: { FindTicketTypeSeatsInput: { eventId, ticketTypeId } },
      })
      .expect(200);

    return response.body;
  };

  const insertSeatMap = async (name: string) => {
    const seatMap = seatMapFactory.build({ name });
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
    return seatMap;
  };

  const insertEvent = async ({
    status = EventStatus.PUBLISHED,
    startAt = hoursFromNow(24),
    seatMapId = null,
  }: {
    status?: EventStatus;
    startAt?: Date;
    seatMapId?: string | null;
  } = {}) => {
    const event = {
      ...eventFactory.build({ venueId: venue.id, status, startAt }),
      seatMapId,
    };
    await testDbClient.batchInsert(Tables.Event, [event]);
    return event;
  };

  const insertVipTicketType = async (eventId: string) => {
    const ticketType = ticketTypeFactory.build({ eventId, sectionKey: 'vip' });
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);
    return ticketType;
  };

  const insertSeats = async (
    seatMapId: string,
    sectionKey: string,
    count: number,
  ) => {
    const seats = seatFactory.buildList(count, { seatMapId, sectionKey });
    await testDbClient.batchInsert(Tables.Seat, seats);
    return seats;
  };

  // An event that would return a ticket type and seats if the condition under
  // test didn't null the response.
  const insertEventWithVipSeats = async (
    event: Parameters<typeof insertEvent>[0] = {},
  ) => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const inserted = await insertEvent({ ...event, seatMapId: seatMap.id });
    const ticketType = await insertVipTicketType(inserted.id!);
    await insertSeats(seatMap.id, 'vip', 2);
    return { seatMap, event: inserted, ticketType };
  };

  it('returns the event, the requested ticket type with every field, and the seat map (SEAT-01)', async () => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const event = await insertEvent({ seatMapId: seatMap.id });
    const vip = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'vip',
      name: 'VIP',
      priceCents: 45000,
      currency: 'EUR',
      seatsAvailable: 40,
      maxPerOrder: 6,
      tags: 'discounted,vip',
    });
    const sectionA = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'a',
      name: 'A',
      priceCents: 40000,
      currency: 'USD',
      seatsAvailable: 120,
      maxPerOrder: 10,
      tags: 'best seller',
    });
    await testDbClient.batchInsert(Tables.TicketType, [vip, sectionA]);

    const forVip = await findTicketTypeSeats(event.id!, vip.id);
    const forSectionA = await findTicketTypeSeats(event.id!, sectionA.id);

    expect(forVip.errors).toBeUndefined();
    expect(forVip.data.findTicketTypeSeats.event).toEqual({
      id: event.id,
      name: event.name,
    });
    expect(forVip.data.findTicketTypeSeats.ticketType).toEqual({
      id: vip.id,
      sectionKey: 'vip',
      name: 'VIP',
      priceCents: 45000,
      currency: 'EUR',
      seatsAvailable: 40,
      maxPerOrder: 6,
      tags: ['discounted', 'vip'],
    });
    expect(forVip.data.findTicketTypeSeats.seatMap).toEqual({
      id: seatMap.id,
      name: 'Concentric Arena',
    });

    expect(forSectionA.errors).toBeUndefined();
    expect(forSectionA.data.findTicketTypeSeats.ticketType).toEqual({
      id: sectionA.id,
      sectionKey: 'a',
      name: 'A',
      priceCents: 40000,
      currency: 'USD',
      seatsAvailable: 120,
      maxPerOrder: 10,
      tags: ['best seller'],
    });
  });

  it("returns exactly the live seats of the ticket type's section on the event's seat map (SEAT-02)", async () => {
    const seatMap = await insertSeatMap('Concentric Arena');
    const otherSeatMap = await insertSeatMap('Football Stadium');
    const event = await insertEvent({ seatMapId: seatMap.id });
    const ticketType = await insertVipTicketType(event.id!);

    const vipSeats = [
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '4',
        number: '09',
        x: 283.5,
        y: 369.25,
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '4',
        number: '10',
        x: 337.5,
        y: 377.25,
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '12',
        number: '01',
        x: 40,
        y: 553,
      }),
    ];
    const sectionASeats = [
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'a',
        row: '4',
        number: '09',
      }),
      seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'a',
        row: '4',
        number: '10',
      }),
    ];
    const otherMapVipSeat = seatFactory.build({
      seatMapId: otherSeatMap.id,
      sectionKey: 'vip',
      row: '4',
      number: '09',
    });
    const deletedVipSeat = {
      ...seatFactory.build({
        seatMapId: seatMap.id,
        sectionKey: 'vip',
        row: '5',
        number: '02',
      }),
      deletedAt: new Date(),
    };
    await testDbClient.batchInsert(Tables.Seat, [
      ...vipSeats,
      ...sectionASeats,
      otherMapVipSeat,
      deletedVipSeat,
    ]);

    const body = await findTicketTypeSeats(event.id!, ticketType.id);

    expect(body.errors).toBeUndefined();
    const byId = (a: { id: string }, b: { id: string }) =>
      a.id.localeCompare(b.id);
    expect([...body.data.findTicketTypeSeats.seats].sort(byId)).toEqual(
      vipSeats
        .map(({ id, row, number, x, y }) => ({ id, row, number, x, y }))
        .sort(byId),
    );
  });

  describe('SEAT-03: unknown, unpublished or past events', () => {
    it('returns the empty shape for an unknown event id', async () => {
      const { ticketType } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(
        faker.string.uuid(),
        ticketType.id,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a draft event', async () => {
      const { event, ticketType } = await insertEventWithVipSeats({
        status: EventStatus.DRAFT,
      });

      const body = await findTicketTypeSeats(event.id!, ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a published event that started 1 hour ago', async () => {
      const { event, ticketType } = await insertEventWithVipSeats({
        startAt: hoursFromNow(-1),
      });

      const body = await findTicketTypeSeats(event.id!, ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  describe('SEAT-04: a ticket type that is not a live one of the event', () => {
    it('returns the empty shape for a ticket type of another upcoming event', async () => {
      const { event } = await insertEventWithVipSeats();
      const otherEvent = await insertEvent({
        startAt: hoursFromNow(48),
        seatMapId: event.seatMapId,
      });
      const otherTicketType = await insertVipTicketType(otherEvent.id!);

      const body = await findTicketTypeSeats(event.id!, otherTicketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for an unknown ticket type id', async () => {
      const { event } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(event.id!, faker.string.uuid());

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape for a soft-deleted ticket type', async () => {
      const seatMap = await insertSeatMap('Concentric Arena');
      const event = await insertEvent({ seatMapId: seatMap.id });
      const deleted = {
        ...ticketTypeFactory.build({ eventId: event.id!, sectionKey: 'vip' }),
        deletedAt: new Date(),
      };
      await testDbClient.batchInsert(Tables.TicketType, [deleted]);
      await insertSeats(seatMap.id, 'vip', 2);

      const body = await findTicketTypeSeats(event.id!, deleted.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  describe('SEAT-05: malformed ids', () => {
    it('returns the empty shape when the event id is not a UUID', async () => {
      const { ticketType } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats('not-a-uuid', ticketType.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });

    it('returns the empty shape when the ticket type id is not a UUID', async () => {
      const { event } = await insertEventWithVipSeats();

      const body = await findTicketTypeSeats(event.id!, 'not-a-uuid');

      expect(body.errors).toBeUndefined();
      expect(body.data.findTicketTypeSeats).toEqual(EMPTY);
    });
  });

  it('returns the event and ticket type with seatMap: null and no seats for an event without a seat map (SEAT-06)', async () => {
    // Seats of the same section exist on another seat map.
    const otherSeatMap = await insertSeatMap('Football Stadium');
    await insertSeats(otherSeatMap.id, 'vip', 2);
    const event = await insertEvent({ seatMapId: null });
    const ticketType = await insertVipTicketType(event.id!);

    const body = await findTicketTypeSeats(event.id!, ticketType.id);

    expect(body.errors).toBeUndefined();
    expect(body.data.findTicketTypeSeats.event).toEqual({
      id: event.id,
      name: event.name,
    });
    expect(body.data.findTicketTypeSeats.ticketType.id).toBe(ticketType.id);
    expect(body.data.findTicketTypeSeats.seatMap).toBeNull();
    expect(body.data.findTicketTypeSeats.seats).toEqual([]);
  });
});
