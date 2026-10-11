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
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { destroyDataSources } from '@testInfra/data-sources.teardown';
import { createNestApp } from '@testInfra/test-e2e.setup';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';

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
    await destroyDataSources(module);
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

  describe('PAY-10: expired holds', () => {
    it('reclaims a seat whose only hold expired 1 s ago for the caller', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [seat] = seats;
      const expiredHold = seatHoldFactory.build({
        eventId: event.id!,
        seatId: seat.id,
        userId: randomUUID(),
        expiresAt: new Date(Date.now() - 1_000),
      });
      await testDbClient.batchInsert(Tables.SeatHold, [expiredHold]);
      const userId = randomUUID();
      const before = Date.now();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [seat.id],
        },
        tokenFor(userId),
      );

      expect(body.errors).toBeUndefined();
      const holds = await testDbClient(Tables.SeatHold).where({
        seatId: seat.id,
      });
      expect(holds).toHaveLength(1);
      expect(holds[0].userId).toBe(userId);
      expectTenMinutesAfter(holds[0].expiresAt, before, Date.now());
    });
  });

  describe('PAY-11: concurrent starts by two users', () => {
    it('lets exactly one of two racing users hold the overlapping seat, 5 times in a row', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [a, b, c] = seats;

      for (let round = 0; round < 5; round++) {
        await testDbClient(Tables.SeatHold).del();
        await testDbClient(Tables.OrderItem).del();
        await testDbClient(Tables.Order).del();
        const firstUser = randomUUID();
        const secondUser = randomUUID();

        const [firstBody, secondBody] = await Promise.all([
          startCheckout(
            {
              eventId: event.id!,
              ticketTypeId: ticketType.id,
              seatIds: [a.id, b.id],
            },
            tokenFor(firstUser),
          ),
          startCheckout(
            {
              eventId: event.id!,
              ticketTypeId: ticketType.id,
              seatIds: [b.id, c.id],
            },
            tokenFor(secondUser),
          ),
        ]);

        const outcomes = [
          { userId: firstUser, body: firstBody, seatIds: [a.id, b.id] },
          { userId: secondUser, body: secondBody, seatIds: [b.id, c.id] },
        ];
        const winners = outcomes.filter(({ body }) => !body.errors);
        const losers = outcomes.filter(({ body }) => body.errors);
        expect(winners).toHaveLength(1);
        expect(losers).toHaveLength(1);
        const [winner] = winners;
        const [loser] = losers;
        expect(reasonOf(loser.body)).toBe('SEATS_UNAVAILABLE');

        const holdsOnB = await testDbClient(Tables.SeatHold).where({
          seatId: b.id,
        });
        expect(holdsOnB).toHaveLength(1);
        expect(holdsOnB[0].userId).toBe(winner.userId);
        expect(
          (await holdsOf(winner.userId)).map((hold) => hold.seatId).sort(),
        ).toEqual([...winner.seatIds].sort());
        expect(await holdsOf(loser.userId)).toHaveLength(0);
        expect(
          await testDbClient(Tables.Order).where({ userId: loser.userId }),
        ).toHaveLength(0);
        expect(
          await testDbClient(Tables.Order).where({ userId: winner.userId }),
        ).toHaveLength(1);
      }
    });
  });

  describe('PAY-14, PAY-15: one active checkout per event', () => {
    it('cancels the pending order and frees its seats when the user starts again with other seats (PAY-14)', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [a, b, c] = seats;
      const userId = randomUUID();
      const token = tokenFor(userId);
      const first = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [a.id, b.id],
        },
        token,
      );
      expect(first.errors).toBeUndefined();

      const second = await startCheckout(
        { eventId: event.id!, ticketTypeId: ticketType.id, seatIds: [c.id] },
        token,
      );

      expect(second.errors).toBeUndefined();
      const firstOrder = await testDbClient(Tables.Order)
        .where({ id: first.data.startCheckout.id })
        .first();
      expect(firstOrder.status).toBe('cancelled');
      const secondOrder = await testDbClient(Tables.Order)
        .where({ id: second.data.startCheckout.id })
        .first();
      expect(secondOrder.status).toBe('pending');
      expect(second.data.startCheckout.id).not.toBe(
        first.data.startCheckout.id,
      );
      expect(
        await testDbClient(Tables.SeatHold).whereIn('seatId', [a.id, b.id]),
      ).toHaveLength(0);
      const holds = await holdsOf(userId);
      expect(holds.map((hold) => hold.seatId)).toEqual([c.id]);
    });

    it('returns the same order unchanged for the same seats in another order, creating no rows (PAY-15)', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [a, b] = seats;
      const userId = randomUUID();
      const token = tokenFor(userId);
      const first = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [a.id, b.id],
        },
        token,
      );
      const holdsBefore = await holdsOf(userId).orderBy('seatId');

      const second = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [b.id, a.id],
        },
        token,
      );

      expect(second.errors).toBeUndefined();
      expect(second.data.startCheckout.id).toBe(first.data.startCheckout.id);
      expect(second.data.startCheckout.expiresAt).toBe(
        first.data.startCheckout.expiresAt,
      );
      expect(second.data.startCheckout.status).toBe('PENDING');
      const orders = await testDbClient(Tables.Order).where({ userId });
      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('pending');
      expect(orders[0].expiresAt.toISOString()).toBe(
        first.data.startCheckout.expiresAt,
      );
      expect(await testDbClient(Tables.OrderItem)).toHaveLength(2);
      expect(await holdsOf(userId).orderBy('seatId')).toEqual(holdsBefore);
    });

    it('starts a new order for the same seats once the pending order has expired, cancelling the expired one (PAY-15)', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [a, b] = seats;
      const userId = randomUUID();
      const expiredAt = new Date(Date.now() - 1_000);
      const expiredOrder = orderFactory.build({
        userId,
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        expiresAt: expiredAt,
      });
      await testDbClient.batchInsert(Tables.Order, [expiredOrder]);
      await testDbClient.batchInsert(
        Tables.OrderItem,
        [a, b].map((seat) =>
          orderItemFactory.build({ orderId: expiredOrder.id, seatId: seat.id }),
        ),
      );
      await testDbClient.batchInsert(
        Tables.SeatHold,
        [a, b].map((seat) =>
          seatHoldFactory.build({
            eventId: event.id!,
            seatId: seat.id,
            userId,
            expiresAt: expiredAt,
          }),
        ),
      );
      const before = Date.now();

      const body = await startCheckout(
        {
          eventId: event.id!,
          ticketTypeId: ticketType.id,
          seatIds: [a.id, b.id],
        },
        tokenFor(userId),
      );

      expect(body.errors).toBeUndefined();
      expect(body.data.startCheckout.id).not.toBe(expiredOrder.id);
      const old = await testDbClient(Tables.Order)
        .where({ id: expiredOrder.id })
        .first();
      expect(old.status).toBe('cancelled');
      const holds = await holdsOf(userId);
      expect(holds).toHaveLength(2);
      for (const hold of holds) {
        expectTenMinutesAfter(hold.expiresAt, before, Date.now());
      }
    });

    it('returns the same order to both calls of a double click on the same seats', async () => {
      const { event, ticketType, seats } = await setupCatalog();
      const [a, b] = seats;
      const userId = randomUUID();
      const token = tokenFor(userId);
      const input = {
        eventId: event.id!,
        ticketTypeId: ticketType.id,
        seatIds: [a.id, b.id],
      };

      const [first, second] = await Promise.all([
        startCheckout(input, token),
        startCheckout(input, token),
      ]);

      expect(first.errors).toBeUndefined();
      expect(second.errors).toBeUndefined();
      expect(second.data.startCheckout.id).toBe(first.data.startCheckout.id);
      expect(await testDbClient(Tables.Order).where({ userId })).toHaveLength(
        1,
      );
      expect(await holdsOf(userId)).toHaveLength(2);
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
