import { randomUUID } from 'crypto';
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
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';

const FIND_CHECKOUT_ORDER = `
  query FindCheckoutOrder($input: FindCheckoutOrderInput!) {
    findCheckoutOrder(input: $input) {
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

const FIND_CHECKOUT_ORDER_ACTION = `
  query FindCheckoutOrder($input: FindCheckoutOrderInput!) {
    findCheckoutOrder(input: $input) {
      id
      status
      secondsLeft
      paymentAction {
        provider
        clientSecret
      }
    }
  }
`;

const PAY_ORDER = `
  mutation PayOrder($input: PayOrderInput!) {
    payOrder(input: $input) {
      status
      paymentAction {
        clientSecret
      }
    }
  }
`;

const CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

describe('TicketingResolver findCheckoutOrder (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();

  const deleteRows = async () => {
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.BillingPayment).del();
    await testDbClient(Tables.BillingSimulatedPayment).del();
    await testDbClient(Tables.BillingPendingCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([TicketingModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient.destroy();
    await destroyDataSources(module);
    await app.getHttpServer().close();
  });

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const fromNow = (ms: number) => new Date(Date.now() + ms);

  const findCheckoutOrder = async (orderId: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: FIND_CHECKOUT_ORDER, variables: { input: { orderId } } })
      .expect(200);
    return response.body;
  };

  // An order of 2 seats with distinct rows and numbers (L-001)
  const insertOrder = async (
    overrides: Parameters<typeof orderFactory.build>[0] = {},
  ) => {
    const order = orderFactory.build({ userId, ...overrides });
    const items = [
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '4',
        seatNumber: '09',
      }),
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '5',
        seatNumber: '12',
      }),
    ];
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    return { order, items };
  };

  it('returns the order to its owner with every field (PAY-23)', async () => {
    const { order, items } = await insertOrder({
      eventName: 'Coldplay: Music of the Spheres',
      eventCoverImage: 'https://example.com/coldplay.jpg',
      eventVenue: 'Allianz Parque',
      eventCity: 'São Paulo',
      eventCountry: 'Brazil',
      ticketTypeName: 'VIP',
      currency: 'USD',
      subtotalCents: 90000,
      serviceFeeCents: 13500,
      taxCents: 7200,
      totalCents: 110700,
      expiresAt: fromNow(5 * 60_000),
    });

    const body = await findCheckoutOrder(order.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    const result = body.data.findCheckoutOrder;
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
        id: order.eventId,
        name: 'Coldplay: Music of the Spheres',
        startAt: order.eventStartAt.toISOString(),
        coverImage: 'https://example.com/coldplay.jpg',
        venue: 'Allianz Parque',
        city: 'São Paulo',
        country: 'Brazil',
      },
      ticketType: { id: order.ticketTypeId, name: 'VIP' },
      items: expect.any(Array),
    });
    expect(result.secondsLeft).toBeGreaterThanOrEqual(299);
    expect(result.secondsLeft).toBeLessThanOrEqual(300);
    expect(
      [...result.items].sort((a, b) => a.row.localeCompare(b.row)),
    ).toEqual([
      { seatId: items[0].seatId, row: '4', number: '09' },
      { seatId: items[1].seatId, row: '5', number: '12' },
    ]);
  });

  describe('PAY-23: orders the caller cannot see', () => {
    it("returns null for another user's order", async () => {
      const { order } = await insertOrder({ userId: randomUUID() });

      const body = await findCheckoutOrder(order.id, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toBeNull();
    });

    it('returns null for an unknown uuid', async () => {
      await insertOrder();

      const body = await findCheckoutOrder(randomUUID(), tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toBeNull();
    });

    it('returns null for an order id that is not a UUID', async () => {
      await insertOrder();

      const body = await findCheckoutOrder('not-a-uuid', tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toBeNull();
    });
  });

  describe('PAY-62: expiry', () => {
    it('reports a pending order that expired 1 s ago as EXPIRED with 0 seconds left', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(-1_000) });

      const body = await findCheckoutOrder(order.id, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toMatchObject({
        status: 'EXPIRED',
        secondsLeft: 0,
      });
    });

    it('reports a pending order expiring in 90 s as PENDING with 89 to 90 seconds left', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(90_000) });

      const body = await findCheckoutOrder(order.id, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      const { status, secondsLeft } = body.data.findCheckoutOrder;
      expect(status).toBe('PENDING');
      expect(secondsLeft).toBeGreaterThanOrEqual(89);
      expect(secondsLeft).toBeLessThanOrEqual(90);
    });
  });

  describe('status mapping', () => {
    it('reports processing as PENDING, and as EXPIRED once past expiresAt', async () => {
      const { order: inFlight } = await insertOrder({
        status: OrderStatus.PROCESSING,
        expiresAt: fromNow(90_000),
      });
      const { order: stuck } = await insertOrder({
        status: OrderStatus.PROCESSING,
        expiresAt: fromNow(-1_000),
      });

      const inFlightBody = await findCheckoutOrder(
        inFlight.id,
        tokenFor(userId),
      );
      const stuckBody = await findCheckoutOrder(stuck.id, tokenFor(userId));

      expect(inFlightBody.data.findCheckoutOrder.status).toBe('PENDING');
      expect(inFlightBody.data.findCheckoutOrder.secondsLeft).toBeGreaterThan(
        0,
      );
      expect(stuckBody.data.findCheckoutOrder).toMatchObject({
        status: 'EXPIRED',
        secondsLeft: 0,
      });
    });

    it('reports cancelled, failed and paid as themselves with 0 seconds left, even before expiresAt', async () => {
      const expected = [
        [OrderStatus.CANCELLED, 'CANCELLED'],
        [OrderStatus.FAILED, 'FAILED'],
        [OrderStatus.PAID, 'PAID'],
      ] as const;

      for (const [status, reported] of expected) {
        const { order } = await insertOrder({
          status,
          expiresAt: fromNow(5 * 60_000),
        });

        const body = await findCheckoutOrder(order.id, tokenFor(userId));

        expect(body.errors).toBeUndefined();
        expect(body.data.findCheckoutOrder).toMatchObject({
          status: reported,
          secondsLeft: 0,
        });
      }
    });
  });

  describe('GW-30, GW-32: the payment action of a paused order', () => {
    const find = async (orderId: string, token?: string) => {
      const call = request(app.getHttpServer()).post('/graphql');
      if (token) {
        call.set('Authorization', `Bearer ${token}`);
      }
      return (
        await call
          .send({
            query: FIND_CHECKOUT_ORDER_ACTION,
            variables: { input: { orderId } },
          })
          .expect(200)
      ).body;
    };

    // Pays a pending order with the 3-D Secure card, which pauses it
    const pause = async (orderId: string) => {
      const body = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${tokenFor(userId)}`)
        .send({
          query: PAY_ORDER,
          variables: {
            input: {
              orderId,
              card: { ...CARD, number: '4000 0027 6000 3184' },
            },
          },
        })
        .expect(200);
      expect(body.body.data.payOrder.status).toBe('REQUIRES_ACTION');
      return body.body.data.payOrder.paymentAction.clientSecret as string;
    };

    it('returns the status REQUIRES_ACTION and the payment action to the owner', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(5 * 60_000) });
      const clientSecret = await pause(order.id);

      const body = await find(order.id, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toMatchObject({
        id: order.id,
        status: 'REQUIRES_ACTION',
        paymentAction: { provider: 'simulated', clientSecret },
      });
      expect(body.data.findCheckoutOrder.secondsLeft).toBeGreaterThan(0);
    });

    it('returns null to another user, so the client secret never leaks', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(5 * 60_000) });
      await pause(order.id);

      const body = await find(order.id, tokenFor(randomUUID()));

      expect(body.errors).toBeUndefined();
      expect(body.data.findCheckoutOrder).toBeNull();
    });

    it('returns no payment action for a pending or a paid order', async () => {
      const { order: pending } = await insertOrder({
        expiresAt: fromNow(5 * 60_000),
      });
      const { order: paid } = await insertOrder({
        status: OrderStatus.PAID,
        paymentId: randomUUID(),
        expiresAt: fromNow(5 * 60_000),
      });

      for (const order of [pending, paid]) {
        const body = await find(order.id, tokenFor(userId));

        expect(body.errors).toBeUndefined();
        expect(body.data.findCheckoutOrder.paymentAction).toBeNull();
      }
    });

    it('returns no payment action once the paused order expired', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(5 * 60_000) });
      await pause(order.id);
      await testDbClient(Tables.Order)
        .where({ id: order.id })
        .update({ expiresAt: fromNow(-1_000) });

      const body = await find(order.id, tokenFor(userId));

      expect(body.data.findCheckoutOrder).toMatchObject({
        status: 'EXPIRED',
        paymentAction: null,
      });
    });
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    const { order } = await insertOrder();

    const body = await findCheckoutOrder(order.id);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toEqual({ findCheckoutOrder: null });
  });
});
