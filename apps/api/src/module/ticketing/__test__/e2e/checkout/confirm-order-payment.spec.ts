import { randomUUID } from 'crypto';
import {
  AuthorizeInput,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { CardInput } from '@billingModule/core/util/card-rules';
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
import { TicketSender } from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const ORDER_FIELDS = `
  id
  status
  secondsLeft
  paymentAction {
    provider
    clientSecret
  }
`;

const PAY_ORDER = `
  mutation PayOrder($input: PayOrderInput!) {
    payOrder(input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

const CONFIRM_ORDER_PAYMENT = `
  mutation ConfirmOrderPayment($input: ConfirmOrderPaymentInput!) {
    confirmOrderPayment(input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

const MY_PAYMENT_CARDS = `
  query MyPaymentCards {
    myPaymentCards {
      brand
      last4
    }
  }
`;

const CHALLENGE_CARD = {
  number: '4000 0027 6000 3184',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

describe('TicketingResolver confirmOrderPayment (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let simulated: SimulatedPaymentGateway;

  // Records every call and delegates to the simulated gateway. The
  // implementations are set in beforeEach because the Jest config resets mocks
  // between tests.
  const gateway = {
    provider: 'simulated' as const,
    acceptsTypedCards: true,
    authorize: jest.fn<
      ReturnType<PaymentGateway['authorize']>,
      [AuthorizeInput, string]
    >(),
    getPayment: jest.fn<ReturnType<PaymentGateway['getPayment']>, [string]>(),
    capture: jest.fn<Promise<void>, [string, string]>(),
    cancel: jest.fn<Promise<void>, [string, string]>(),
    refund: jest.fn<Promise<void>, [string, string]>(),
    tokenize: jest.fn<ReturnType<PaymentGateway['tokenize']>, [CardInput]>(),
    detach: jest.fn<Promise<void>, [string]>(),
  };
  const sender = { send: jest.fn<Promise<void>, [unknown]>() };

  const userId = randomUUID();
  const email = `buyer-${userId}@example.com`;

  const deleteRows = async () => {
    await testDbClient(Tables.Ticket).del();
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.BillingPayment).del();
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
    await testDbClient(Tables.BillingSimulatedPayment).del();
    await testDbClient(Tables.BillingPendingCard).del();
    await testDbClient(Tables.NotificationsNotification).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, TicketingModule],
    })
      .overrideProvider(PaymentGateway)
      .useValue(gateway)
      .overrideProvider(TicketSender)
      .useValue(sender)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    jwtService = module.get(JwtService);
    simulated = module.get(SimulatedPaymentGateway, { strict: false });
    await testDbClient.batchInsert(Tables.IdentityUser, [
      { id: userId, email, passwordHash: 'x'.repeat(60) },
    ]);
  });

  beforeEach(async () => {
    await deleteRows();
    gateway.authorize.mockImplementation((input, key) =>
      simulated.authorize(input, key),
    );
    gateway.getPayment.mockImplementation((id) => simulated.getPayment(id));
    gateway.capture.mockImplementation((id) => simulated.capture(id));
    gateway.cancel.mockImplementation((id) => simulated.cancel(id));
    gateway.refund.mockImplementation((id) => simulated.refund(id));
    gateway.tokenize.mockImplementation((card) => simulated.tokenize(card));
    gateway.detach.mockImplementation(() => simulated.detach());
    sender.send.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient(Tables.IdentityUser).where({ id: userId }).del();
    await testDbClient.destroy();
    for (const name of [
      'ticketing',
      'catalog',
      'billing',
      'identity',
      'user-profile',
      'notifications',
    ]) {
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

  const graphql = async (
    query: string,
    input: Record<string, unknown>,
    token: string | undefined = tokenFor(userId),
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    return (await call.send({ query, variables: { input } }).expect(200)).body;
  };

  const confirm = (orderId: string, token?: string) =>
    graphql(CONFIRM_ORDER_PAYMENT, { orderId }, token);

  const errorOf = (body: {
    errors?: {
      extensions: { originalError?: { reason?: string; message?: string } };
    }[];
  }) => body.errors?.[0]?.extensions.originalError;

  // A 2-seat order with the user's holds, paid with the 3-D Secure card so it
  // ends paused. Returns the order and the challenge's client secret.
  const insertPausedOrder = async ({
    saveCard = false,
    expiresIn = 5 * 60_000,
  }: { saveCard?: boolean; expiresIn?: number } = {}) => {
    const order = orderFactory.build({
      userId,
      expiresAt: fromNow(expiresIn),
    });
    const items = [
      orderItemFactory.build({ orderId: order.id }),
      orderItemFactory.build({ orderId: order.id }),
    ];
    const holds = items.map((item) =>
      seatHoldFactory.build({
        eventId: order.eventId,
        seatId: item.seatId,
        userId,
        expiresAt: order.expiresAt,
      }),
    );
    await testDbClient.batchInsert(Tables.Order, [order]);
    await testDbClient.batchInsert(Tables.OrderItem, items);
    await testDbClient.batchInsert(Tables.SeatHold, holds);

    const paid = await graphql(PAY_ORDER, {
      orderId: order.id,
      card: CHALLENGE_CARD,
      saveCard,
    });
    expect(paid.data.payOrder.status).toBe('REQUIRES_ACTION');
    return {
      order,
      holds,
      clientSecret: paid.data.payOrder.paymentAction.clientSecret as string,
    };
  };

  const orderRow = (orderId: string) =>
    testDbClient(Tables.Order).where({ id: orderId }).first();

  const paymentsOf = (orderId: string) =>
    testDbClient(Tables.BillingPayment).where({ orderId });

  const ticketsOf = (eventId: string) =>
    testDbClient(Tables.Ticket).where({ eventId });

  describe('after the challenge is approved (GW-09)', () => {
    it('issues the tickets, captures the payment and answers PAID', async () => {
      const { order, clientSecret } = await insertPausedOrder();
      await simulated.approve(clientSecret);

      const body = await confirm(order.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.confirmOrderPayment).toMatchObject({
        id: order.id,
        status: 'PAID',
        paymentAction: null,
      });
      const [payment] = await paymentsOf(order.id);
      expect(payment.status).toBe('succeeded');
      expect(gateway.capture).toHaveBeenCalledTimes(1);
      expect(gateway.capture).toHaveBeenCalledWith(
        payment.providerPaymentId,
        `${payment.id}:capture`,
      );
      const row = await orderRow(order.id);
      expect(row.status).toBe('paid');
      expect(row.paymentId).toBe(payment.id);
      expect(await ticketsOf(order.eventId)).toHaveLength(2);
      expect(
        await testDbClient(Tables.SeatHold).where({ userId }),
      ).toHaveLength(0);
      expect(sender.send).toHaveBeenCalledTimes(1);
      const notifications = await testDbClient(
        Tables.NotificationsNotification,
      ).where({ userId });
      expect(notifications.map((row) => row.type)).toEqual([
        'purchase_confirmed',
      ]);
    });

    it('saves the card the buyer asked to save once the payment is captured (GW-50)', async () => {
      const { order, clientSecret } = await insertPausedOrder({
        saveCard: true,
      });
      await simulated.approve(clientSecret);

      const body = await confirm(order.id);

      expect(body.data.confirmOrderPayment.status).toBe('PAID');
      const cards = await graphql(MY_PAYMENT_CARDS, {});
      expect(cards.data.myPaymentCards).toEqual([
        { brand: 'visa', last4: '3184' },
      ]);
      expect(await testDbClient(Tables.BillingPendingCard)).toHaveLength(0);
    });

    it('clears the card throttle of a challenged payment that is authorized (GW-17)', async () => {
      const { order, clientSecret } = await insertPausedOrder();
      await testDbClient(Tables.BillingCardThrottle).insert({
        id: randomUUID(),
        userId,
        failedCount: 3,
        windowStartedAt: new Date(),
        lockedUntil: null,
      });
      await simulated.approve(clientSecret);

      await confirm(order.id);

      expect(await testDbClient(Tables.BillingCardThrottle)).toHaveLength(0);
    });

    it('cancels the authorization and fails the order when the seats were lost after the approval (GW-18)', async () => {
      const { order, holds, clientSecret } = await insertPausedOrder();
      await simulated.approve(clientSecret);
      await testDbClient(Tables.SeatHold).where({ id: holds[0].id }).del();

      const body = await confirm(order.id);

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      const [payment] = await paymentsOf(order.id);
      expect(payment.status).toBe('cancelled');
      expect(gateway.cancel).toHaveBeenCalledWith(
        payment.providerPaymentId,
        `${payment.id}:cancel`,
      );
      expect(gateway.capture).not.toHaveBeenCalled();
      expect(gateway.refund).not.toHaveBeenCalled();
      expect((await orderRow(order.id)).status).toBe('failed');
      expect(await ticketsOf(order.eventId)).toHaveLength(0);
    });
  });

  describe('after the challenge failed (GW-10)', () => {
    it('fails with AUTHENTICATION_FAILED, frees the order, stores the notification and counts one throttle failure', async () => {
      const { order, clientSecret } = await insertPausedOrder({
        saveCard: true,
      });
      await simulated.fail(clientSecret);

      const body = await confirm(order.id);

      expect(errorOf(body)?.reason).toBe('AUTHENTICATION_FAILED');
      expect(errorOf(body)?.message).toBe(
        "We couldn't verify this payment with your bank. Try again or use another card.",
      );
      const [payment] = await paymentsOf(order.id);
      expect(payment).toMatchObject({
        status: 'failed',
        failureReason: 'authentication_failed',
      });
      expect((await orderRow(order.id)).status).toBe('pending');
      const notifications = await testDbClient(
        Tables.NotificationsNotification,
      ).where({ userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'payment_unsuccessful',
        sourceId: payment.id,
      });
      const [throttle] = await testDbClient(Tables.BillingCardThrottle).where({
        userId,
      });
      expect(throttle.failedCount).toBe(1);
      expect(await testDbClient(Tables.BillingPendingCard)).toHaveLength(0);
      expect(await testDbClient(Tables.BillingPaymentCard)).toHaveLength(0);
      expect(await ticketsOf(order.eventId)).toHaveLength(0);
    });

    it('lets the buyer pay again with another card afterwards', async () => {
      const { order, clientSecret } = await insertPausedOrder();
      await simulated.fail(clientSecret);
      await confirm(order.id);

      const retried = await graphql(PAY_ORDER, {
        orderId: order.id,
        card: { ...CHALLENGE_CARD, number: '4242 4242 4242 4242' },
      });

      expect(retried.errors).toBeUndefined();
      expect(retried.data.payOrder.status).toBe('PAID');
    });
  });

  it('answers REQUIRES_ACTION with the same payment action and changes nothing while the challenge is still pending (GW-11)', async () => {
    const { order, clientSecret } = await insertPausedOrder();

    const body = await confirm(order.id);

    expect(body.errors).toBeUndefined();
    expect(body.data.confirmOrderPayment).toMatchObject({
      id: order.id,
      status: 'REQUIRES_ACTION',
      paymentAction: { provider: 'simulated', clientSecret },
    });
    expect(body.data.confirmOrderPayment.secondsLeft).toBeGreaterThan(0);
    const [payment] = await paymentsOf(order.id);
    expect(payment.status).toBe('requires_action');
    expect((await orderRow(order.id)).status).toBe('requires_action');
    expect(await testDbClient(Tables.BillingCardThrottle)).toHaveLength(0);
    expect(await ticketsOf(order.eventId)).toHaveLength(0);
    expect(
      await testDbClient(Tables.NotificationsNotification).where({ userId }),
    ).toHaveLength(0);
  });

  it('can be repeated until the buyer finishes the challenge', async () => {
    const { order, clientSecret } = await insertPausedOrder();
    await confirm(order.id);
    await simulated.approve(clientSecret);

    const body = await confirm(order.id);

    expect(body.data.confirmOrderPayment.status).toBe('PAID');
  });

  describe('after the order expired (GW-12)', () => {
    it('cancels the payment, frees the order and fails with ORDER_EXPIRED', async () => {
      const { order, clientSecret } = await insertPausedOrder();
      await simulated.approve(clientSecret);
      await testDbClient(Tables.Order)
        .where({ id: order.id })
        .update({ expiresAt: fromNow(-1_000) });

      const body = await confirm(order.id);

      expect(errorOf(body)?.reason).toBe('ORDER_EXPIRED');
      const [payment] = await paymentsOf(order.id);
      expect(payment.status).toBe('cancelled');
      expect(gateway.cancel).toHaveBeenCalledWith(
        payment.providerPaymentId,
        `${payment.id}:cancel`,
      );
      expect(gateway.capture).not.toHaveBeenCalled();
      expect((await orderRow(order.id)).status).toBe('pending');
      expect(await ticketsOf(order.eventId)).toHaveLength(0);
    });
  });

  describe('an order that is already paid (GW-13)', () => {
    it('answers PAID without calling the gateway', async () => {
      const { order, clientSecret } = await insertPausedOrder();
      await simulated.approve(clientSecret);
      await confirm(order.id);
      jest.clearAllMocks();

      const body = await confirm(order.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.confirmOrderPayment.status).toBe('PAID');
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(gateway.capture).not.toHaveBeenCalled();
      expect(gateway.cancel).not.toHaveBeenCalled();
      expect(sender.send).not.toHaveBeenCalled();
      expect(await ticketsOf(order.eventId)).toHaveLength(2);
    });
  });

  describe('2 confirmations at the same time (GW-14)', () => {
    it('issues and captures once; the other call fails with PAYMENT_IN_PROGRESS, 3 times over', async () => {
      for (let round = 0; round < 3; round++) {
        const { order, clientSecret } = await insertPausedOrder();
        await simulated.approve(clientSecret);
        gateway.capture.mockClear();
        // Holds the winner inside the claim long enough for the loser to meet it
        gateway.getPayment.mockImplementation(async (id) => {
          await new Promise((done) => setTimeout(done, 250));
          return simulated.getPayment(id);
        });

        const bodies = await Promise.all([
          confirm(order.id),
          confirm(order.id),
        ]);

        const winners = bodies.filter((body) => !body.errors);
        const losers = bodies.filter((body) => body.errors);
        expect(winners).toHaveLength(1);
        expect(winners[0].data.confirmOrderPayment.status).toBe('PAID');
        expect(losers).toHaveLength(1);
        expect(errorOf(losers[0])?.reason).toBe('PAYMENT_IN_PROGRESS');
        expect(gateway.capture).toHaveBeenCalledTimes(1);
        expect(await ticketsOf(order.eventId)).toHaveLength(2);
        gateway.getPayment.mockImplementation((id) => simulated.getPayment(id));
      }
    });
  });

  describe('orders that are not the caller to settle (GW-15)', () => {
    it("fails with ORDER_NOT_FOUND for another user's order", async () => {
      const { order } = await insertPausedOrder();

      const body = await confirm(order.id, tokenFor(randomUUID()));

      expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
      expect((await orderRow(order.id)).status).toBe('requires_action');
      expect(gateway.getPayment).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown uuid', () => randomUUID()],
      ['an id that is not a UUID', () => 'not-a-uuid'],
    ])('fails with ORDER_NOT_FOUND for %s', async (_, orderIdOf) => {
      const body = await confirm(orderIdOf());

      expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
    });

    it.each([OrderStatus.PENDING, OrderStatus.CANCELLED, OrderStatus.FAILED])(
      'fails with ORDER_NOT_FOUND for a %s order',
      async (status) => {
        const order = orderFactory.build({
          userId,
          status,
          expiresAt: fromNow(5 * 60_000),
        });
        await testDbClient.batchInsert(Tables.Order, [order]);
        await testDbClient.batchInsert(Tables.OrderItem, [
          orderItemFactory.build({ orderId: order.id }),
        ]);

        const body = await confirm(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect((await orderRow(order.id)).status).toBe(status);
        expect(gateway.getPayment).not.toHaveBeenCalled();
      },
    );

    it('responds UNAUTHENTICATED without a token', async () => {
      const { order } = await insertPausedOrder();

      const body = await confirm(order.id, '');

      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });
  });

  it('puts the order back to waiting when the gateway fails while settling', async () => {
    const { order } = await insertPausedOrder();
    gateway.getPayment.mockRejectedValueOnce(new Error('gateway unavailable'));

    const body = await confirm(order.id);

    expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
    expect((await orderRow(order.id)).status).toBe('requires_action');
    const retried = await confirm(order.id);
    expect(retried.data.confirmOrderPayment.status).toBe('REQUIRES_ACTION');
  });
});
