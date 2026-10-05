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
import { CatalogApi } from '@sharedModules/integration/interface/catalog-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { DataSource } from 'typeorm';

describe('CatalogPublicApiProvider.findCheckoutSelection (integration)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let catalogApi: CatalogApi;

  const venue = venueFactory.build({
    name: 'Allianz Parque',
    city: 'São Paulo',
    country: 'Brazil',
  });

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3_600_000);

  const deleteRows = async () => {
    await testDbClient(Tables.Seat).del();
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    catalogApi = module.get<CatalogApi>(CatalogApi);
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

  const insertSeatMap = async () => {
    const seatMap = seatMapFactory.build({ name: 'Concentric Arena' });
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
    return seatMap;
  };

  const insertEvent = async ({
    status = EventStatus.PUBLISHED,
    startAt = hoursFromNow(24),
    seatMapId,
  }: {
    status?: EventStatus;
    startAt?: Date;
    seatMapId: string | null;
  }) => {
    const event = {
      ...eventFactory.build({ venueId: venue.id, status, startAt }),
      seatMapId,
    };
    await testDbClient.batchInsert(Tables.Event, [event]);
    return event;
  };

  const insertVipTicketType = async (
    eventId: string,
    overrides: Parameters<typeof ticketTypeFactory.build>[0] = {},
  ) => {
    const ticketType = ticketTypeFactory.build({
      eventId,
      sectionKey: 'vip',
      ...overrides,
    });
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);
    return ticketType;
  };

  const insertSeats = async (
    seatMapId: string,
    sectionKey: string,
    overrides: Partial<ReturnType<typeof seatFactory.build>>[] = [],
  ) => {
    const seats = overrides.map((override) =>
      seatFactory.build({ seatMapId, sectionKey, ...override }),
    );
    await testDbClient.batchInsert(Tables.Seat, seats);
    return seats;
  };

  // A full, valid setup that would return a selection if the condition under
  // test didn't null the response.
  const setupValidSelection = async () => {
    const seatMap = await insertSeatMap();
    const event = await insertEvent({ seatMapId: seatMap.id });
    const ticketType = await insertVipTicketType(event.id!, {
      priceCents: 45000,
      serviceFeeCents: 6750,
      taxCents: 3600,
      currency: 'EUR',
      maxPerOrder: 6,
    });
    const seats = await insertSeats(seatMap.id, 'vip', [
      { row: '4', number: '09' },
      { row: '4', number: '10' },
    ]);
    return { seatMap, event, ticketType, seats };
  };

  it("returns the event, ticket type and exactly the requested seats of the ticket type's section (PAY-07)", async () => {
    const { event, ticketType, seats } = await setupValidSelection();

    const selection = await catalogApi.findCheckoutSelection({
      eventId: event.id!,
      ticketTypeId: ticketType.id,
      seatIds: seats.map((seat) => seat.id),
    });

    expect(selection).toEqual({
      event: {
        id: event.id,
        name: event.name,
        startAt: event.startAt,
        coverImage: event.coverImage,
        venue: 'Allianz Parque',
        city: 'São Paulo',
        country: 'Brazil',
      },
      ticketType: {
        id: ticketType.id,
        name: ticketType.name,
        priceCents: 45000,
        serviceFeeCents: 6750,
        taxCents: 3600,
        currency: 'EUR',
        maxPerOrder: 6,
      },
      seats: [
        { id: seats[0].id, row: '4', number: '09' },
        { id: seats[1].id, row: '4', number: '10' },
      ],
    });
  });

  describe('PAY-13: returns null for an invalid selection', () => {
    it('returns null for an unpublished event', async () => {
      const { event, ticketType, seats } = await setupValidSelection();
      await testDbClient(Tables.Event)
        .where('id', event.id)
        .update({ status: EventStatus.DRAFT });

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: seats.map((seat) => seat.id),
      });

      expect(selection).toBeNull();
    });

    it('returns null for a past event', async () => {
      const seatMap = await insertSeatMap();
      const event = await insertEvent({
        seatMapId: seatMap.id,
        startAt: hoursFromNow(-1),
      });
      const ticketType = await insertVipTicketType(event.id!);
      const seats = await insertSeats(seatMap.id, 'vip', [
        { row: '1', number: '01' },
      ]);

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: seats.map((seat) => seat.id),
      });

      expect(selection).toBeNull();
    });

    it('returns null for a ticket type of another event', async () => {
      const { event, seats } = await setupValidSelection();
      const otherEvent = await insertEvent({ seatMapId: null });
      const otherTicketType = await insertVipTicketType(otherEvent.id!);

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: otherTicketType.id,
        seatIds: seats.map((seat) => seat.id),
      });

      expect(selection).toBeNull();
    });

    it('returns null when a seat belongs to another section of the same map', async () => {
      const { event, ticketType, seatMap } = await setupValidSelection();
      const [otherSectionSeat] = await insertSeats(seatMap.id, 'a', [
        { row: '1', number: '01' },
      ]);

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: [otherSectionSeat.id],
      });

      expect(selection).toBeNull();
    });

    it('returns null for an unknown seat id', async () => {
      const { event, ticketType, seats } = await setupValidSelection();

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: [...seats.map((seat) => seat.id), faker.string.uuid()],
      });

      expect(selection).toBeNull();
    });

    it('returns null for a non-UUID seat id', async () => {
      const { event, ticketType } = await setupValidSelection();

      const selection = await catalogApi.findCheckoutSelection({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: ['not-a-uuid'],
      });

      expect(selection).toBeNull();
    });

    it('returns null for an unknown event id', async () => {
      const { ticketType, seats } = await setupValidSelection();

      const selection = await catalogApi.findCheckoutSelection({
        eventId: faker.string.uuid(),
        ticketTypeId: ticketType.id,
        seatIds: seats.map((seat) => seat.id),
      });

      expect(selection).toBeNull();
    });
  });
});
