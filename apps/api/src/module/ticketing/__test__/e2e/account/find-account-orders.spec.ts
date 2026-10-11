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

const FIND_ACCOUNT_ORDERS = `
  query FindAccountOrders($input: FindAccountOrdersInput!) {
    findAccountOrders(input: $input) {
      items {
        id
        status
        createdAt
        eventName
        quantity
        currency
        totalCents
      }
      counts {
        all
        pending
        cancelled
        completed
      }
      page
      totalPages
    }
  }
`;

const DAY = 24 * 60 * 60_000;

describe('TicketingResolver findAccountOrders (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();
  // Owns one paid order only, so its other tabs are empty
  const singleOrderUserId = randomUUID();

  type Seeded = Awaited<ReturnType<typeof insertOrder>>;
  const seeded: Record<string, Seeded> = {};

  const deleteRows = async () => {
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
  };

  const fromNow = (ms: number) => new Date(Date.now() + ms);

  const insertOrder = async ({
    owner = userId,
    status,
    age,
    totalCents,
    seats,
    expiresIn = 10 * 60_000,
    eventName,
  }: {
    owner?: string;
    status: OrderStatus;
    age: number;
    totalCents: number;
    seats: number;
    expiresIn?: number;
    eventName: string;
  }) => {
    const order = {
      ...orderFactory.build({
        userId: owner,
        status,
        totalCents,
        eventName,
        currency: 'USD',
        expiresAt: fromNow(expiresIn),
      }),
      createdAt: fromNow(-age),
    };
    const items = Array.from({ length: seats }, (_, index) =>
      orderItemFactory.build({
        orderId: order.id,
        seatRow: '7',
        seatNumber: String(index + 1).padStart(2, '0'),
      }),
    );
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    return order;
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([TicketingModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);

    await deleteRows();
    // 2 paid, 1 live pending, 1 live processing, 1 cancelled
    seeded.paidOld = await insertOrder({
      status: OrderStatus.PAID,
      age: 5 * DAY,
      totalCents: 30000,
      seats: 1,
      eventName: 'Coldplay',
    });
    seeded.paidNew = await insertOrder({
      status: OrderStatus.PAID,
      age: 1 * DAY,
      totalCents: 50000,
      seats: 2,
      eventName: 'Adele',
    });
    seeded.pending = await insertOrder({
      status: OrderStatus.PENDING,
      age: 3 * DAY,
      totalCents: 45000,
      seats: 3,
      eventName: 'Metallica',
    });
    seeded.processing = await insertOrder({
      status: OrderStatus.PROCESSING,
      age: 2 * DAY,
      totalCents: 10000,
      seats: 1,
      eventName: 'Beyonce',
    });
    seeded.cancelled = await insertOrder({
      status: OrderStatus.CANCELLED,
      age: 4 * DAY,
      totalCents: 20000,
      seats: 2,
      eventName: 'Shakira',
    });
    // Never listed: expired pending, failed, another user's order
    await insertOrder({
      status: OrderStatus.PENDING,
      age: 0,
      totalCents: 99999,
      seats: 1,
      expiresIn: -1_000,
      eventName: 'Expired',
    });
    await insertOrder({
      status: OrderStatus.FAILED,
      age: 60_000,
      totalCents: 88888,
      seats: 1,
      eventName: 'Failed',
    });
    await insertOrder({
      owner: otherUserId,
      status: OrderStatus.PAID,
      age: 60_000,
      totalCents: 77777,
      seats: 1,
      eventName: 'Other user',
    });
    seeded.singleOrder = await insertOrder({
      owner: singleOrderUserId,
      status: OrderStatus.PAID,
      age: 60_000,
      totalCents: 15000,
      seats: 1,
      eventName: 'Only order',
    });
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

  const findAccountOrders = async (
    input: Record<string, unknown>,
    token?: string,
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: FIND_ACCOUNT_ORDERS, variables: { input } })
      .expect(200);
    return response.body;
  };

  const summaryOf = (order: Seeded, status: string, quantity: number) => ({
    id: order.id,
    status,
    createdAt: order.createdAt.toISOString(),
    eventName: order.eventName,
    quantity,
    currency: 'USD',
    totalCents: order.totalCents,
  });

  it("returns the caller's visible orders newest first with per-tab counts and mapped statuses (ORDLIST-01, ORDLIST-02)", async () => {
    const body = await findAccountOrders(
      { page: 1, pageSize: 20 },
      tokenFor(userId),
    );

    expect(body.errors).toBeUndefined();
    expect(body.data.findAccountOrders).toEqual({
      items: [
        summaryOf(seeded.paidNew, 'COMPLETED', 2),
        summaryOf(seeded.processing, 'PENDING', 1),
        summaryOf(seeded.pending, 'PENDING', 3),
        summaryOf(seeded.cancelled, 'CANCELLED', 2),
        summaryOf(seeded.paidOld, 'COMPLETED', 1),
      ],
      counts: { all: 5, pending: 2, cancelled: 1, completed: 2 },
      page: 1,
      totalPages: 1,
    });
  });

  it('splits 5 orders into 2 pages of 4, with 1 order on page 2 (ORDLIST-05)', async () => {
    const body = await findAccountOrders(
      { tab: 'ALL', sort: 'NEWEST', page: 2, pageSize: 4 },
      tokenFor(userId),
    );

    expect(body.errors).toBeUndefined();
    const result = body.data.findAccountOrders;
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      seeded.paidOld.id,
    ]);
  });

  it('serves page 1 and reports page 1 when the requested page is past the end (ORDLIST-06)', async () => {
    const body = await findAccountOrders(
      { tab: 'ALL', sort: 'NEWEST', page: 9, pageSize: 4 },
      tokenFor(userId),
    );

    expect(body.errors).toBeUndefined();
    const result = body.data.findAccountOrders;
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      seeded.paidNew.id,
      seeded.processing.id,
      seeded.pending.id,
      seeded.cancelled.id,
    ]);
  });

  it('returns no items and 0 pages for an empty tab (ORDEMPTY-01)', async () => {
    const body = await findAccountOrders(
      { tab: 'CANCELLED', sort: 'NEWEST', page: 1, pageSize: 4 },
      tokenFor(singleOrderUserId),
    );

    expect(body.errors).toBeUndefined();
    expect(body.data.findAccountOrders).toEqual({
      items: [],
      counts: { all: 1, pending: 0, cancelled: 0, completed: 1 },
      page: 1,
      totalPages: 0,
    });
  });

  describe('input validation', () => {
    it.each([
      ['page 0', { page: 0, pageSize: 4 }],
      ['pageSize 0', { page: 1, pageSize: 0 }],
      ['pageSize 21', { page: 1, pageSize: 21 }],
    ])('rejects %s with BAD_USER_INPUT', async (_, input) => {
      const body = await findAccountOrders(input, tokenFor(userId));

      expect(body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(body.errors[0].extensions.originalError.reason).toBe(
        'INVALID_PAGE',
      );
      expect(body.data).toBeNull();
    });
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    const body = await findAccountOrders({ page: 1, pageSize: 4 });

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
  });
});
