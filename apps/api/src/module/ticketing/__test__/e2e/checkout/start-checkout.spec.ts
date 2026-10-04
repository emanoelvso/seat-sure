import { randomUUID } from 'crypto';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';
import { DataSource } from 'typeorm';

const TEN_MINUTES = 10 * 60_000;

const START_CHECKOUT = `
  mutation StartCheckout($input: StartCheckoutInput!) {
    startCheckout(input: $input) {
      id
      status
      expiresAt
      secondsLeft
      quantity
      currency
      subtotalCents
      serviceFeeCents
      taxCents
      totalCents
      unitPriceCents
      unitServiceFeeCents
      unitTaxCents
      event {
        id
        name
        startAt
        coverImage
        venue
        city
        country
      }
      ticketType {
        id
        name
      }
      items {
        seatId
        row
        number
      }
    }
  }
`;

describe('TicketingResolver startCheckout (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const venue = venueFactory.build({
    name: 'Allianz Parque',
    city: 'São Paulo',
    country: 'Brazil',
  });

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3_600_000);

  const deleteRows = async () => {
    await testDbClient(Tables.Ticket).del();
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.Seat).del();
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([TicketingModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
    await testDbClient.batchInsert(Tables.Venue, [venue]);
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient(Tables.Venue).where('id', venue.id).del();
    await testDbClient.destroy();
    for (const name of ['ticketing', 'catalog']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
    await app.getHttpServer().close();
  });

  const tokenFor = (userId: string) =>
    jwtService.sign({
      sub: userId,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const insertEvent = async (
    seatMapId: string,
    {
      status = EventStatus.PUBLISHED,
      startAt = hoursFromNow(48),
    }: { status?: EventStatus; startAt?: Date } = {},
  ) => {
    const event = {
      ...eventFactory.build({ venueId: venue.id, status, startAt }),
      seatMapId,
    };
    await testDbClient.batchInsert(Tables.Event, [event]);
    return event;
  };

  // A published upcoming event with a VIP ticket type (maxPerOrder 3) and four
  // VIP seats with distinct rows and numbers, plus one seat of another section
  // of the same map.
  const setupCatalog = async (
    eventOptions: { status?: EventStatus; startAt?: Date } = {},
  ) => {
    const seatMap = seatMapFactory.build({ name: 'Concentric Arena' });
    await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);
    const event = await insertEvent(seatMap.id, eventOptions);
    const ticketType = ticketTypeFactory.build({
      eventId: event.id!,
      sectionKey: 'vip',
      name: 'VIP',
      priceCents: 45000,
      serviceFeeCents: 6750,
      taxCents: 3600,
      currency: 'USD',
      maxPerOrder: 3,
    });
    await testDbClient.batchInsert(Tables.TicketType, [ticketType]);
    const seats = [
      { row: '4', number: '09' },
      { row: '5', number: '12' },
      { row: '6', number: '03' },
      { row: '8', number: '15' },
    ].map((seat) =>
      seatFactory.build({ seatMapId: seatMap.id, sectionKey: 'vip', ...seat }),
    );
    const otherSectionSeat = seatFactory.build({
      seatMapId: seatMap.id,
      sectionKey: 'ga',
      row: '1',
      number: '01',
    });
    await testDbClient.batchInsert(Tables.Seat, [...seats, otherSectionSeat]);
    return { seatMap, event, ticketType, seats, otherSectionSeat };
  };

  const startCheckout = async (
    input: { eventId: string; ticketTypeId: string; seatIds: string[] },
    token?: string,
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: START_CHECKOUT, variables: { input } })
      .expect(200);
    return response.body;
  };

  const reasonOf = (body: {
    errors?: { extensions: { originalError?: { reason?: string } } }[];
  }) => body.errors?.[0]?.extensions.originalError?.reason;

  const holdsOf = (userId: string) =>
    testDbClient(Tables.SeatHold).where({ userId });

  const expectNothingCreated = async () => {
    expect(await testDbClient(Tables.SeatHold)).toHaveLength(0);
    expect(await testDbClient(Tables.Order)).toHaveLength(0);
    expect(await testDbClient(Tables.OrderItem)).toHaveLength(0);
  };

  // Starts a checkout for two VIP seats and records the request window
  const startTwoSeats = async () => {
    const catalog = await setupCatalog();
    const userId = randomUUID();
    const [first, second] = catalog.seats;
    const before = Date.now();
    const body = await startCheckout(
      {
        eventId: catalog.event.id!,
        ticketTypeId: catalog.ticketType.id,
        seatIds: [first.id, second.id],
      },
      tokenFor(userId),
    );
    const after = Date.now();
    return { ...catalog, userId, first, second, before, after, body };
  };

  const expectTenMinutesAfter = (
    value: Date | string,
    before: number,
    after: number,
  ) => {
    const time = new Date(value).getTime();
    expect(time).toBeGreaterThanOrEqual(before + TEN_MINUTES - 2_000);
    expect(time).toBeLessThanOrEqual(after + TEN_MINUTES + 2_000);
  };

  describe('a valid selection', () => {
    it('holds both seats for the user until 10 minutes after the request (PAY-06)', async () => {
      const { userId, first, second, before, after, body } =
        await startTwoSeats();

      expect(body.errors).toBeUndefined();
      const holds = await holdsOf(userId);
      expect(holds.map((hold) => hold.seatId).sort()).toEqual(
        [first.id, second.id].sort(),
      );
      for (const hold of holds) {
        expectTenMinutesAfter(hold.expiresAt, before, after);
      }
      expect(holds[0].expiresAt).toEqual(holds[1].expiresAt);
    });

    it('creates a pending order with the holds expiry and the event and ticket type snapshots (PAY-06, PAY-07)', async () => {
      const { userId, event, ticketType, body } = await startTwoSeats();

      expect(body.errors).toBeUndefined();
      const orders = await testDbClient(Tables.Order).where({ userId });
      expect(orders).toHaveLength(1);
      const [order] = orders;
      const [hold] = await holdsOf(userId);
      expect(order).toMatchObject({
        id: body.data.startCheckout.id,
        userId,
        eventId: event.id,
        status: 'pending',
        eventName: event.name,
        eventCoverImage: event.coverImage,
        eventVenue: 'Allianz Parque',
        eventCity: 'São Paulo',
        eventCountry: 'Brazil',
        ticketTypeId: ticketType.id,
        ticketTypeName: 'VIP',
        currency: 'USD',
        paidAt: null,
        paymentId: null,
      });
      expect(order.eventStartAt).toEqual(event.startAt);
      expect(order.expiresAt).toEqual(hold.expiresAt);
    });

    it('stores one item per seat with its row, number, price, fee and tax (PAY-07)', async () => {
      const { first, second, body } = await startTwoSeats();

      const items = await testDbClient(Tables.OrderItem)
        .where({ orderId: body.data.startCheckout.id })
        .orderBy('seatRow');
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        seatId: first.id,
        seatRow: '4',
        seatNumber: '09',
        unitPriceCents: 45000,
        serviceFeeCents: 6750,
        taxCents: 3600,
      });
      expect(items[1]).toMatchObject({
        seatId: second.id,
        seatRow: '5',
        seatNumber: '12',
        unitPriceCents: 45000,
        serviceFeeCents: 6750,
        taxCents: 3600,
      });
    });

    it('stores the subtotal, fee, tax and total for the two seats (PAY-08)', async () => {
      const { body } = await startTwoSeats();

      const order = await testDbClient(Tables.Order)
        .where({ id: body.data.startCheckout.id })
        .first();
      expect(order).toMatchObject({
        subtotalCents: 90000,
        serviceFeeCents: 13500,
        taxCents: 7200,
        totalCents: 110700,
      });
    });

    it('returns every field of the pending checkout order', async () => {
      const { userId, event, ticketType, first, second, body } =
        await startTwoSeats();

      expect(body.errors).toBeUndefined();
      const order = await testDbClient(Tables.Order).where({ userId }).first();
      const result = body.data.startCheckout;
      expect(result).toEqual({
        id: order.id,
        status: 'PENDING',
        expiresAt: order.expiresAt.toISOString(),
        secondsLeft: expect.any(Number),
        quantity: 2,
        currency: 'USD',
        subtotalCents: 90000,
        serviceFeeCents: 13500,
        taxCents: 7200,
        totalCents: 110700,
        unitPriceCents: 45000,
        unitServiceFeeCents: 6750,
        unitTaxCents: 3600,
        event: {
          id: event.id,
          name: event.name,
          startAt: event.startAt!.toISOString(),
          coverImage: event.coverImage,
          venue: 'Allianz Parque',
          city: 'São Paulo',
          country: 'Brazil',
        },
        ticketType: { id: ticketType.id, name: 'VIP' },
        items: expect.any(Array),
      });
      expect(result.secondsLeft).toBeGreaterThanOrEqual(599);
      expect(result.secondsLeft).toBeLessThanOrEqual(600);
      expect(
        [...result.items].sort((a, b) => a.row.localeCompare(b.row)),
      ).toEqual([
        { seatId: first.id, row: '4', number: '09' },
        { seatId: second.id, row: '5', number: '12' },
      ]);
    });
  });

  describe('PAY-09: seats taken by someone else', () => {
    it("fails with SEATS_UNAVAILABLE when one seat has another user's active hold, creating no order and no hold on the other seat", async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [free, held] = seats;
      const otherUserId = randomUUID();
      await testDbClient.batchInsert(Tables.SeatHold, [
        seatHoldFactory.build({
          eventId: event.id!,
          seatId: held.id,
          userId: otherUserId,
          expiresAt: new Date(Date.now() + 5 * 60_000),
        }),
      ]);
      const userId = randomUUID();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [free.id, held.id],
        },
        tokenFor(userId),
      );

      expect(reasonOf(body)).toBe('SEATS_UNAVAILABLE');
      expect(body.data).toBeNull();
      expect(await holdsOf(userId)).toHaveLength(0);
      expect(
        await testDbClient(Tables.SeatHold).where({ seatId: free.id }),
      ).toHaveLength(0);
      expect(await testDbClient(Tables.Order)).toHaveLength(0);
      const [otherHold] = await testDbClient(Tables.SeatHold).where({
        seatId: held.id,
      });
      expect(otherHold.userId).toBe(otherUserId);
    });

    it('fails with SEATS_UNAVAILABLE when one seat has an issued ticket, creating no order and no hold', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [free, sold] = seats;
      await testDbClient.batchInsert(Tables.Ticket, [
        ticketFactory.build({
          eventId: event.id!,
          seatId: sold.id,
          status: TicketStatus.ISSUED,
        }),
      ]);

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [free.id, sold.id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('SEATS_UNAVAILABLE');
      await expectNothingCreated();
    });
  });

  describe('PAY-12: authentication', () => {
    it('responds UNAUTHENTICATED without a token and creates nothing', async () => {
      const { event, ticketType, seats } = await setupCatalog();

      const body = await startCheckout({
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: [seats[0].id],
      });

      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      await expectNothingCreated();
    });

    it('responds UNAUTHENTICATED for a token signed with another secret and creates nothing', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const foreignToken = jwtService.sign(
        {
          sub: randomUUID(),
          sid: randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 900,
        },
        { secret: 'a'.repeat(32) },
      );

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id],
        },
        foreignToken,
      );

      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      await expectNothingCreated();
    });
  });

  describe('PAY-13: invalid selections', () => {
    it('accepts exactly maxPerOrder seats', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const userId = randomUUID();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: seats.slice(0, 3).map((seat) => seat.id),
        },
        tokenFor(userId),
      );

      expect(body.errors).toBeUndefined();
      expect(body.data.startCheckout.quantity).toBe(3);
      expect(await holdsOf(userId)).toHaveLength(3);
    });

    it('fails with INVALID_SELECTION for maxPerOrder + 1 seats and holds nothing', async () => {
      const { event, ticketType, seats } = await setupCatalog();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: seats.map((seat) => seat.id),
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for 0 seats', async () => {
      const { event, ticketType } = await setupCatalog();

      const body = await startCheckout(
        { eventId: event.id!, ticketTypeId: ticketType.id, seatIds: [] },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for a duplicate seat id', async () => {
      const { event, ticketType, seats } = await setupCatalog();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id, seats[1].id, seats[0].id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it("fails with INVALID_SELECTION for a seat of another section of the event's map", async () => {
      const { event, ticketType, seats, otherSectionSeat } =
        await setupCatalog();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id, otherSectionSeat.id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for an unpublished event', async () => {
      const { event, ticketType, seats } = await setupCatalog({
        status: EventStatus.DRAFT,
      });

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for a past event', async () => {
      const { event, ticketType, seats } = await setupCatalog({
        startAt: hoursFromNow(-1),
      });

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for a ticket type of another event', async () => {
      const { seatMap, event, seats } = await setupCatalog();
      const otherEvent = await insertEvent(seatMap.id);
      const otherTicketType = ticketTypeFactory.build({
        eventId: otherEvent.id!,
        sectionKey: 'vip',
      });
      await testDbClient.batchInsert(Tables.TicketType, [otherTicketType]);

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: otherTicketType.id,
          seatIds: [seats[0].id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });

    it('fails with INVALID_SELECTION for a non-UUID event id', async () => {
      const { ticketType, seats } = await setupCatalog();

      const body = await startCheckout(
        {
          eventId: 'not-a-uuid',
          ticketTypeId: ticketType.id,
          seatIds: [seats[0].id],
        },
        tokenFor(randomUUID()),
      );

      expect(reasonOf(body)).toBe('INVALID_SELECTION');
      await expectNothingCreated();
    });
  });
});
