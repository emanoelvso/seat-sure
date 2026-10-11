import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { billingPaymentFactory } from '@billingModule/__test__/factory/billing-payment.factory';
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

const FIND_ACCOUNT_ORDER = `
  query FindAccountOrder($input: FindAccountOrderInput!) {
    findAccountOrder(input: $input) {
      id
      status
      createdAt
      event {
        name
        coverImage
        venue
        city
        country
        startAt
      }
      ticketTypeName
      items {
        row
        number
      }
      quantity
      currency
      serviceFeeCents
      taxCents
      totalCents
      paymentId
      paymentCard {
        brand
        last4
      }
    }
  }
`;

describe('TicketingResolver findAccountOrder (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();

  const deleteRows = async () => {
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.BillingPayment).del();
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

  const findAccountOrder = async (orderId: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: FIND_ACCOUNT_ORDER, variables: { input: { orderId } } })
      .expect(200);
    return response.body;
  };

  // An order of 2 seats in row 7 (seats 10 and 07)
  const insertOrder = async (
    overrides: Parameters<typeof orderFactory.build>[0] = {},
  ) => {
    const order = {
      ...orderFactory.build({ userId, ...overrides }),
      createdAt: fromNow(-2 * 60 * 60_000),
    };
    const items = [
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '7',
        seatNumber: '10',
      }),
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '7',
        seatNumber: '07',
      }),
    ];
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    return order;
  };

  const bySeat = (items: { row: string; number: string }[]) =>
    [...items].sort((a, b) =>
      `${a.row}-${a.number}`.localeCompare(`${b.row}-${b.number}`),
    );

  it('returns a paid order as COMPLETED with every field and its payment card (ORDDETAIL-02)', async () => {
    const payment = billingPaymentFactory.build({
      userId,
      cardBrand: 'visa',
      cardLast4: '4242',
    });
    await testDbClient.batchInsert(Tables.BillingPayment, [payment]);
    const order = await insertOrder({
      status: OrderStatus.PAID,
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
      paidAt: fromNow(-60 * 60_000),
      paymentId: payment.id,
    });

    const body = await findAccountOrder(order.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    const result = body.data.findAccountOrder;
    expect(result).toEqual({
      id: order.id,
      status: 'COMPLETED',
      createdAt: order.createdAt.toISOString(),
      event: {
        name: 'Coldplay: Music of the Spheres',
        coverImage: 'https://example.com/coldplay.jpg',
        venue: 'Allianz Parque',
        city: 'São Paulo',
        country: 'Brazil',
        startAt: order.eventStartAt.toISOString(),
      },
      ticketTypeName: 'VIP',
      items: expect.any(Array),
      quantity: 2,
      currency: 'USD',
      serviceFeeCents: 13500,
      taxCents: 7200,
      totalCents: 110700,
      paymentId: payment.id,
      paymentCard: { brand: 'visa', last4: '4242' },
    });
    expect(bySeat(result.items)).toEqual([
      { row: '7', number: '07' },
      { row: '7', number: '10' },
    ]);
  });

  it('returns a cancelled order as CANCELLED with no payment id and no card (ORDDETAIL-02)', async () => {
    const order = await insertOrder({ status: OrderStatus.CANCELLED });

    const body = await findAccountOrder(order.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.findAccountOrder).toMatchObject({
      id: order.id,
      status: 'CANCELLED',
      paymentId: null,
      paymentCard: null,
    });
  });

  it('returns a null card when Billing has no payment for the paid order', async () => {
    const paymentId = randomUUID();
    const order = await insertOrder({
      status: OrderStatus.PAID,
      paidAt: fromNow(-60 * 60_000),
      paymentId,
    });

    const body = await findAccountOrder(order.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.findAccountOrder).toMatchObject({
      id: order.id,
      status: 'COMPLETED',
      paymentId,
      paymentCard: null,
    });
  });

  describe('ORDDETAIL-04: orders without a detail page', () => {
    it.each([
      [
        "another user's paid order",
        { userId: randomUUID(), status: OrderStatus.PAID },
      ],
      [
        'a live pending order',
        { status: OrderStatus.PENDING, expiresAt: fromNow(5 * 60_000) },
      ],
      [
        'a live processing order',
        { status: OrderStatus.PROCESSING, expiresAt: fromNow(5 * 60_000) },
      ],
      [
        'an expired pending order',
        { status: OrderStatus.PENDING, expiresAt: fromNow(-1_000) },
      ],
      ['a failed order', { status: OrderStatus.FAILED }],
    ])('returns null for %s', async (_, overrides) => {
      const order = await insertOrder(overrides);

      const body = await findAccountOrder(order.id, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findAccountOrder).toBeNull();
    });

    it.each([
      ['an unknown uuid', randomUUID()],
      ['an id that is not a UUID', 'not-a-uuid'],
    ])('returns null for %s', async (_, orderId) => {
      await insertOrder({ status: OrderStatus.PAID });

      const body = await findAccountOrder(orderId, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.findAccountOrder).toBeNull();
    });
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    const order = await insertOrder({ status: OrderStatus.PAID });

    const body = await findAccountOrder(order.id);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toEqual({ findAccountOrder: null });
  });
});
