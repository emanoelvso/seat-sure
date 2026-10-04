import { randomUUID } from 'crypto';
import {
  ChargeInput,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const PAY_ORDER = `
  mutation PayOrder($input: PayOrderInput!) {
    payOrder(input: $input) {
      id
      status
      totalCents
      items {
        seatId
      }
    }
  }
`;

const VALID_CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

describe('TicketingResolver payOrder (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  // Records every charge and delegates to the simulated gateway, so
  // 4000 0000 0000 0002 is still declined. The implementations are set in
  // beforeEach because the Jest config resets mocks between tests.
  const simulated = new SimulatedPaymentGateway();
  const gateway = {
    charge: jest.fn<ReturnType<PaymentGateway['charge']>, [ChargeInput]>(),
    refund: jest.fn<Promise<void>, [string]>(),
  };

  const userId = randomUUID();

  const deleteRows = async () => {
    await testDbClient(Tables.Ticket).del();
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.BillingPayment).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, TicketingModule],
    })
      .overrideProvider(PaymentGateway)
      .useValue(gateway)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await deleteRows();
    gateway.charge.mockImplementation((input) => simulated.charge(input));
    gateway.refund.mockImplementation(() => simulated.refund());
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient.destroy();
    for (const name of ['ticketing', 'catalog', 'billing']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
    await app.getHttpServer().close();
  });

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const fromNow = (ms: number) => new Date(Date.now() + ms);

  const payOrder = async (
    orderId: string,
    card: typeof VALID_CARD = VALID_CARD,
    token: string | undefined = tokenFor(userId),
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: PAY_ORDER, variables: { input: { orderId, card } } })
      .expect(200);
    return response.body;
  };

  const errorOf = (body: {
    errors?: {
      extensions: {
        originalError?: { reason?: string; fields?: Record<string, string> };
      };
    }[];
  }) => body.errors?.[0]?.extensions.originalError;

  // A 2-seat order of 110700 USD with the user's holds on both seats, which
  // expire with the order.
  const insertOrder = async (
    overrides: Parameters<typeof orderFactory.build>[0] = {},
  ) => {
    const order = orderFactory.build({
      userId,
      expiresAt: fromNow(5 * 60_000),
      ...overrides,
    });
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
    const holds = items.map((item) =>
      seatHoldFactory.build({
        eventId: order.eventId,
        seatId: item.seatId,
        userId: order.userId,
        expiresAt: order.expiresAt,
      }),
    );
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    await testDbClient.batchInsert(Tables.SeatHold, holds);
    return { order, items, holds };
  };

  const orderRow = (orderId: string) =>
    testDbClient(Tables.Order).where({ id: orderId }).first();

  describe('guards', () => {
    it('fails an order that expired 1 s ago with ORDER_EXPIRED without charging (PAY-41)', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(-1_000) });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('ORDER_EXPIRED');
      expect(gateway.charge).not.toHaveBeenCalled();
    });

    it('fails a paid order with ORDER_ALREADY_PAID without charging (PAY-42)', async () => {
      const { order } = await insertOrder({
        status: OrderStatus.PAID,
        paidAt: new Date(),
        paymentId: randomUUID(),
      });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('ORDER_ALREADY_PAID');
      expect(gateway.charge).not.toHaveBeenCalled();
    });

    it('fails a processing order with PAYMENT_IN_PROGRESS without charging', async () => {
      const { order } = await insertOrder({ status: OrderStatus.PROCESSING });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('PAYMENT_IN_PROGRESS');
      expect(gateway.charge).not.toHaveBeenCalled();
    });

    describe('PAY-43: ORDER_NOT_FOUND without charging', () => {
      it('for a cancelled order', async () => {
        const { order } = await insertOrder({
          status: OrderStatus.CANCELLED,
        });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.charge).not.toHaveBeenCalled();
      });

      it('for a failed order', async () => {
        const { order } = await insertOrder({ status: OrderStatus.FAILED });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.charge).not.toHaveBeenCalled();
      });

      it("for another user's order", async () => {
        const { order } = await insertOrder({ userId: randomUUID() });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.charge).not.toHaveBeenCalled();
        expect((await orderRow(order.id)).status).toBe('pending');
      });

      it('for an unknown uuid', async () => {
        await insertOrder();

        const body = await payOrder(randomUUID());

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.charge).not.toHaveBeenCalled();
      });

      it('for an order id that is not a UUID', async () => {
        await insertOrder();

        const body = await payOrder('not-a-uuid');

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.charge).not.toHaveBeenCalled();
      });
    });

    it('fails a bad number and an empty holder with INVALID_CARD naming exactly those fields, without charging (PAY-44)', async () => {
      const { order } = await insertOrder();

      const body = await payOrder(order.id, {
        ...VALID_CARD,
        number: '4242 4242 4242 4241',
        holder: '',
      });

      const error = errorOf(body);
      expect(error?.reason).toBe('INVALID_CARD');
      expect(error?.fields).toEqual({
        number: 'Enter a valid card number',
        holder: 'Enter the name on the card',
      });
      expect(gateway.charge).not.toHaveBeenCalled();
      expect((await orderRow(order.id)).status).toBe('pending');
    });

    it('responds UNAUTHENTICATED without a token', async () => {
      const { order } = await insertOrder();

      const body = await payOrder(order.id, VALID_CARD, '');

      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(body.data).toBeNull();
      expect(gateway.charge).not.toHaveBeenCalled();
    });
  });
});
