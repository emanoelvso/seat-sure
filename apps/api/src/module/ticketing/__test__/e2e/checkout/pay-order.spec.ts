import { randomUUID } from 'crypto';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import {
  AuthorizeInput,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { PendingCardService } from '@billingModule/core/service/pending-card.service';
import { CardInput } from '@billingModule/core/util/card-rules';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { NotificationsPublicApiProvider } from '@notificationsModule/integration/provider/public-api.provider';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { TicketSender } from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketCodeGenerator } from '@ticketingModule/core/service/ticket-code-generator.service';
import { LogTicketSender } from '@ticketingModule/integration/provider/log-ticket-sender.provider';
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

const FIND_UNAVAILABLE_SEATS = `
  query FindUnavailableSeats($input: FindUnavailableSeatsInput!) {
    findUnavailableSeats(FindUnavailableSeatsInput: $input) {
      seatIds
    }
  }
`;

const MY_PAYMENT_CARDS = `
  query MyPaymentCards {
    myPaymentCards {
      id
      brand
      last4
      isDefault
    }
  }
`;

const VALID_CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

const DECLINED_CARD = { ...VALID_CARD, number: '4000 0000 0000 0002' };

describe('TicketingResolver payOrder (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  // Records every charge and delegates to the simulated gateway, so
  // 4000 0000 0000 0002 is still declined. The implementations are set in
  // beforeEach because the Jest config resets mocks between tests.
  let simulated: SimulatedPaymentGateway;
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

  // Records every ticket notice
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

  // payOrder with any input shape: a saved card id, or both or neither source
  const payOrderWith = async (input: Record<string, unknown>) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${tokenFor(userId)}`)
      .send({ query: PAY_ORDER, variables: { input } })
      .expect(200);
    return response.body;
  };

  const errorOf = (body: {
    errors?: {
      extensions: {
        originalError?: {
          reason?: string;
          message?: string;
          fields?: Record<string, string>;
        };
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

  const paymentsOf = (orderId: string) =>
    testDbClient(Tables.BillingPayment).where({ orderId });

  const findUnavailableSeats = async (eventId: string): Promise<string[]> => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: FIND_UNAVAILABLE_SEATS,
        variables: { input: { eventId } },
      })
      .expect(200);
    return response.body.data.findUnavailableSeats.seatIds;
  };

  describe('guards', () => {
    it('fails an order that expired 1 s ago with ORDER_EXPIRED without charging (PAY-41)', async () => {
      const { order } = await insertOrder({ expiresAt: fromNow(-1_000) });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('ORDER_EXPIRED');
      expect(gateway.authorize).not.toHaveBeenCalled();
    });

    it('fails a paid order with ORDER_ALREADY_PAID without charging (PAY-42)', async () => {
      const { order } = await insertOrder({
        status: OrderStatus.PAID,
        paidAt: new Date(),
        paymentId: randomUUID(),
      });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('ORDER_ALREADY_PAID');
      expect(gateway.authorize).not.toHaveBeenCalled();
    });

    it('fails a processing order with PAYMENT_IN_PROGRESS without charging', async () => {
      const { order } = await insertOrder({ status: OrderStatus.PROCESSING });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('PAYMENT_IN_PROGRESS');
      expect(gateway.authorize).not.toHaveBeenCalled();
    });

    describe('PAY-43: ORDER_NOT_FOUND without charging', () => {
      it('for a cancelled order', async () => {
        const { order } = await insertOrder({
          status: OrderStatus.CANCELLED,
        });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
      });

      it('for a failed order', async () => {
        const { order } = await insertOrder({ status: OrderStatus.FAILED });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
      });

      it("for another user's order", async () => {
        const { order } = await insertOrder({ userId: randomUUID() });

        const body = await payOrder(order.id);

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
        expect((await orderRow(order.id)).status).toBe('pending');
      });

      it('for an unknown uuid', async () => {
        await insertOrder();

        const body = await payOrder(randomUUID());

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
      });

      it('for an order id that is not a UUID', async () => {
        await insertOrder();

        const body = await payOrder('not-a-uuid');

        expect(errorOf(body)?.reason).toBe('ORDER_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
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
      expect(gateway.authorize).not.toHaveBeenCalled();
      expect((await orderRow(order.id)).status).toBe('pending');
    });

    it('responds UNAUTHENTICATED without a token', async () => {
      const { order } = await insertOrder();

      const body = await payOrder(order.id, VALID_CARD, '');

      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(body.data).toBeNull();
      expect(gateway.authorize).not.toHaveBeenCalled();
    });
  });

  describe('a card the gateway approves', () => {
    it('records one succeeded payment for the order total with the brand and last 4 (PAY-37)', async () => {
      const { order } = await insertOrder();

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      const payments = await paymentsOf(order.id);
      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        userId,
        orderId: order.id,
        status: 'succeeded',
        amountCents: 110700,
        currency: 'USD',
        cardBrand: 'visa',
        cardLast4: '4242',
      });
      expect(gateway.authorize).toHaveBeenCalledTimes(1);
    });

    it('marks the order paid with paidAt and the payment id (PAY-38)', async () => {
      const { order, items } = await insertOrder();
      const before = Date.now();

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder).toEqual({
        id: order.id,
        status: 'PAID',
        totalCents: 110700,
        items: expect.arrayContaining(
          items.map((item) => ({ seatId: item.seatId })),
        ),
      });
      const [payment] = await paymentsOf(order.id);
      const row = await orderRow(order.id);
      expect(row.status).toBe('paid');
      expect(row.paymentId).toBe(payment.id);
      expect(row.paidAt.getTime()).toBeGreaterThanOrEqual(before - 1_000);
      expect(row.paidAt.getTime()).toBeLessThanOrEqual(Date.now() + 1_000);
    });

    it('issues one ticket per item with distinct 12-character codes and deletes the holds (PAY-38)', async () => {
      const { order, items } = await insertOrder();

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      const tickets = await testDbClient(Tables.Ticket).where({
        eventId: order.eventId,
      });
      expect(tickets).toHaveLength(2);
      expect(
        tickets
          .map(({ status, userId: owner, seatId, orderItemId }) => ({
            status,
            userId: owner,
            seatId,
            orderItemId,
          }))
          .sort((a, b) => a.seatId.localeCompare(b.seatId)),
      ).toEqual(
        items
          .map((item) => ({
            status: 'issued',
            userId,
            seatId: item.seatId,
            orderItemId: item.id,
          }))
          .sort((a, b) => a.seatId.localeCompare(b.seatId)),
      );
      for (const ticket of tickets) {
        expect(ticket.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
      }
      expect(tickets[0].code).not.toBe(tickets[1].code);
      expect(
        await testDbClient(Tables.SeatHold).where({ eventId: order.eventId }),
      ).toHaveLength(0);
    });

    it('keeps both seats unavailable once sold (PAY-57)', async () => {
      const { order, items } = await insertOrder();

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      expect((await findUnavailableSeats(order.eventId)).sort()).toEqual(
        items.map((item) => item.seatId).sort(),
      );
    });
  });

  describe('a card the gateway declines or a gateway failure', () => {
    it('fails with CARD_DECLINED, records a failed payment and leaves the order pending with its holds; a retry with another card succeeds (PAY-40)', async () => {
      const { order, holds } = await insertOrder();

      const declined = await payOrder(order.id, DECLINED_CARD);

      expect(errorOf(declined)?.reason).toBe('CARD_DECLINED');
      const payments = await paymentsOf(order.id);
      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        status: 'failed',
        cardLast4: '0002',
      });
      expect((await orderRow(order.id)).status).toBe('pending');
      expect(
        (await testDbClient(Tables.SeatHold).where({ userId }))
          .map((hold) => hold.id)
          .sort(),
      ).toEqual(holds.map((hold) => hold.id).sort());
      expect(await testDbClient(Tables.Ticket)).toHaveLength(0);

      const retried = await payOrder(order.id);

      expect(retried.errors).toBeUndefined();
      expect(retried.data.payOrder.status).toBe('PAID');
      expect(
        (await paymentsOf(order.id)).map((payment) => payment.status).sort(),
      ).toEqual(['failed', 'succeeded']);
    });

    it('answers a gateway error with a generic error, leaves the order pending and records no payment (PAY-53)', async () => {
      const { order } = await insertOrder();
      gateway.authorize.mockRejectedValue(new Error('gateway unavailable'));

      const body = await payOrder(order.id);

      expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect(errorOf(body)?.reason).toBeUndefined();
      expect((await orderRow(order.id)).status).toBe('pending');
      expect(await paymentsOf(order.id)).toHaveLength(0);
      expect(await testDbClient(Tables.Ticket)).toHaveLength(0);
    });
  });

  describe('ticket notice', () => {
    it("sends the notice once with the buyer's email, the event name and the issued codes (PAY-39)", async () => {
      const { order } = await insertOrder({
        eventName: 'Coldplay: Music of the Spheres',
      });

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      const codes = (
        await testDbClient(Tables.Ticket).where({ eventId: order.eventId })
      ).map((ticket) => ticket.code);
      expect(codes).toHaveLength(2);
      expect(sender.send).toHaveBeenCalledTimes(1);
      expect(sender.send).toHaveBeenCalledWith({
        email,
        eventName: 'Coldplay: Music of the Spheres',
        codes: expect.arrayContaining(codes),
      });
      const [[notice]] = sender.send.mock.calls as [[{ codes: string[] }]];
      expect(notice.codes).toHaveLength(2);
    });

    it('fails the 6th declined typed charge with CARD_ATTEMPTS_LIMITED, charging nothing and leaving the order payable (TYPEDTHROTTLE-02)', async () => {
      const { order } = await insertOrder();
      for (let i = 0; i < 5; i += 1) {
        expect(errorOf(await payOrder(order.id, DECLINED_CARD))?.reason).toBe(
          'CARD_DECLINED',
        );
      }
      gateway.authorize.mockClear();

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('CARD_ATTEMPTS_LIMITED');
      expect(gateway.authorize).not.toHaveBeenCalled();
      expect(await paymentsOf(order.id)).toHaveLength(5);
      expect((await orderRow(order.id)).status).toBe('pending');

      await testDbClient(Tables.BillingCardThrottle).where({ userId }).del();
      const retried = await payOrder(order.id);

      expect(retried.errors).toBeUndefined();
      expect(retried.data.payOrder.status).toBe('PAID');
    });

    it('sends no notice when the card is declined', async () => {
      const { order } = await insertOrder();

      const body = await payOrder(order.id, DECLINED_CARD);

      expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
      expect(sender.send).not.toHaveBeenCalled();
    });

    it('still answers PAID when the sender fails, and logs the failure with the order id', async () => {
      const { order } = await insertOrder();
      sender.send.mockRejectedValueOnce(new Error('mail server down'));
      const errorSpy = jest.spyOn(AppLogger.prototype, 'error');

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect((await orderRow(order.id)).status).toBe('paid');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ orderId: order.id }),
      );
      errorSpy.mockRestore();
    });
  });

  it('logs no card number or CVV across a purchase and a decline (PAY-47)', async () => {
    const cvv = '987';
    const spies = (['log', 'warn', 'error'] as const).map((method) =>
      jest.spyOn(AppLogger.prototype, method),
    );
    // The real log sender, so the notice itself goes through the spy
    const logSender = new LogTicketSender(module.get(AppLogger));
    sender.send.mockImplementation((input) =>
      logSender.send(input as Parameters<LogTicketSender['send']>[0]),
    );
    const { order: declinedOrder } = await insertOrder();
    const { order: paidOrder } = await insertOrder();

    const declined = await payOrder(declinedOrder.id, {
      ...DECLINED_CARD,
      cvv,
    });
    const paid = await payOrder(paidOrder.id, { ...VALID_CARD, cvv });

    expect(errorOf(declined)?.reason).toBe('CARD_DECLINED');
    expect(paid.data.payOrder.status).toBe('PAID');
    expect(spies[0]).toHaveBeenCalledWith(
      'Sending tickets',
      expect.objectContaining({ email }),
    );
    const logged = spies
      .flatMap((spy) => spy.mock.calls)
      .map((args) => JSON.stringify(args));
    for (const line of logged) {
      expect(line).not.toContain('4242424242424242');
      expect(line).not.toContain('4242 4242 4242 4242');
      expect(line).not.toContain('4000000000000002');
      expect(line).not.toContain('4000 0000 0000 0002');
      expect(line).not.toContain(`"${cvv}"`);
    }
    for (const spy of spies) {
      spy.mockRestore();
    }
  });

  describe('a saved card (CARD-08)', () => {
    const insertSavedCard = async (
      overrides: Parameters<typeof billingPaymentCardFactory.build>[0] = {},
    ) => {
      const card = billingPaymentCardFactory.build({ userId, ...overrides });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [card]);
      return card;
    };

    it("pays the order, issues the tickets, and records the saved card's brand and last 4 (AC 8, 11)", async () => {
      const { order } = await insertOrder();
      const savedCard = await insertSavedCard({
        brand: 'mastercard',
        last4: '4444',
      });

      const body = await payOrderWith({
        orderId: order.id,
        savedCardId: savedCard.id,
      });

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect((await orderRow(order.id)).status).toBe('paid');
      expect(
        await testDbClient(Tables.Ticket).where({ eventId: order.eventId }),
      ).toHaveLength(2);
      const payments = await paymentsOf(order.id);
      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        status: 'succeeded',
        amountCents: 110700,
        cardBrand: 'mastercard',
        cardLast4: '4444',
      });
      expect(gateway.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 110700,
          source: { type: 'token', token: savedCard.providerToken },
        }),
        expect.any(String),
      );
    });

    it.each([
      [
        "another user's card",
        async () => (await insertSavedCard({ userId: randomUUID() })).id,
      ],
      [
        'a removed card',
        async () => {
          const card = await insertSavedCard();
          await testDbClient(Tables.BillingPaymentCard)
            .where({ id: card.id })
            .del();
          return card.id;
        },
      ],
    ])(
      'fails %s with CARD_NOT_FOUND, charges nothing, and leaves the order payable (AC 9)',
      async (_, savedCardIdOf) => {
        const { order } = await insertOrder();
        const savedCardId = await savedCardIdOf();

        const body = await payOrderWith({ orderId: order.id, savedCardId });

        expect(errorOf(body)?.reason).toBe('CARD_NOT_FOUND');
        expect(gateway.authorize).not.toHaveBeenCalled();
        expect(await paymentsOf(order.id)).toHaveLength(0);
        expect((await orderRow(order.id)).status).toBe('pending');

        const retried = await payOrder(order.id);

        expect(retried.errors).toBeUndefined();
        expect(retried.data.payOrder.status).toBe('PAID');
      },
    );

    it('fails with CARD_DECLINED when the saved card is declined, leaving the order pending (AC 10)', async () => {
      const { order } = await insertOrder();
      const savedCard = await insertSavedCard({
        providerToken: `sim_pm_decline_${randomUUID()}`,
        last4: '0341',
      });

      const body = await payOrderWith({
        orderId: order.id,
        savedCardId: savedCard.id,
      });

      expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
      expect((await orderRow(order.id)).status).toBe('pending');
      expect(await testDbClient(Tables.Ticket)).toHaveLength(0);
    });

    it('fails with CARD_ATTEMPTS_LIMITED when the user is locked, charging nothing and leaving the order payable (CARDABUSE-01 AC 2)', async () => {
      const { order } = await insertOrder();
      const savedCard = await insertSavedCard();
      await testDbClient(Tables.BillingCardThrottle).insert({
        id: randomUUID(),
        userId,
        failedCount: 0,
        windowStartedAt: new Date(),
        lockedUntil: new Date(Date.now() + 10 * 60_000),
      });

      const body = await payOrderWith({
        orderId: order.id,
        savedCardId: savedCard.id,
      });

      expect(errorOf(body)?.reason).toBe('CARD_ATTEMPTS_LIMITED');
      expect(gateway.authorize).not.toHaveBeenCalled();
      expect(await paymentsOf(order.id)).toHaveLength(0);
      expect((await orderRow(order.id)).status).toBe('pending');

      await testDbClient(Tables.BillingCardThrottle).where({ userId }).del();
      const retried = await payOrderWith({
        orderId: order.id,
        savedCardId: savedCard.id,
      });

      expect(retried.errors).toBeUndefined();
      expect(retried.data.payOrder.status).toBe('PAID');
    });

    it.each([
      [
        'both a card and a saved card id',
        { card: VALID_CARD, savedCardId: randomUUID() },
      ],
      ['neither a card nor a saved card id', {}],
    ])(
      'fails %s with INVALID_CARD "Choose a payment method." and no fields, without charging',
      async (_, source) => {
        const { order } = await insertOrder();

        const body = await payOrderWith({ orderId: order.id, ...source });

        const error = errorOf(body);
        expect(error?.reason).toBe('INVALID_CARD');
        expect(error?.message).toBe('Choose a payment method.');
        expect(error?.fields).toBeUndefined();
        expect(gateway.authorize).not.toHaveBeenCalled();
        expect((await orderRow(order.id)).status).toBe('pending');
      },
    );
  });

  describe('saving the card while paying (CARD-09)', () => {
    const myPaymentCards = async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${tokenFor(userId)}`)
        .send({ query: MY_PAYMENT_CARDS })
        .expect(200);
      return response.body.data.myPaymentCards;
    };

    it('saves the card as the default when the payment succeeds and it is the first card (AC 3)', async () => {
      const { order } = await insertOrder();

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(body.data.payOrder.status).toBe('PAID');
      expect(await myPaymentCards()).toEqual([
        {
          id: expect.any(String),
          brand: 'visa',
          last4: '4242',
          isDefault: true,
        },
      ]);
    });

    it.each([
      ['saveCard: false', { saveCard: false }],
      ['saveCard omitted', {}],
    ])('saves no card with %s (AC 6)', async (_, saveCard) => {
      const { order } = await insertOrder();

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        ...saveCard,
      });

      expect(body.data.payOrder.status).toBe('PAID');
      expect(await myPaymentCards()).toEqual([]);
    });

    it('saves no card when the payment is declined (AC 4)', async () => {
      const { order } = await insertOrder();

      // A card that tokenizes fine but whose charge is declined, so a save
      // attempted after a decline would actually store it.
      gateway.authorize.mockResolvedValueOnce({
        status: 'failed',
        reason: 'card_declined',
      });

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
      expect(await myPaymentCards()).toEqual([]);
      // The card was tokenized before the charge, so the declined payment
      // drops the held card and detaches its token (GW-50)
      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
        [],
      );
      expect(gateway.detach).toHaveBeenCalledTimes(1);
    });

    it('saves no card when the seats were lost after the charge (CARD-09 AC 4)', async () => {
      const { order, holds } = await insertOrder();
      await testDbClient(Tables.SeatHold).where({ id: holds[0].id }).del();

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      expect(await myPaymentCards()).toEqual([]);
    });

    it('still pays when the card is already saved, and keeps the list unchanged (AC 5)', async () => {
      const { order: first } = await insertOrder();
      await payOrderWith({
        orderId: first.id,
        card: VALID_CARD,
        saveCard: true,
      });
      const before = await myPaymentCards();
      const { order } = await insertOrder();

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect(before).toHaveLength(1);
      expect(await myPaymentCards()).toEqual(before);
    });

    it('still pays with 5 cards already saved, and keeps the list unchanged (AC 5)', async () => {
      await testDbClient.batchInsert(
        Tables.BillingPaymentCard,
        Array.from({ length: 5 }, (_, index) =>
          billingPaymentCardFactory.build({
            userId,
            isDefault: index === 0,
            last4: `000${index}`,
          }),
        ),
      );
      const before = await myPaymentCards();
      const { order } = await insertOrder();

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect(before).toHaveLength(5);
      expect(await myPaymentCards()).toEqual(before);
    });

    it('still pays when saving the held card fails, and logs the failure with the order and payment ids only (AC 5)', async () => {
      const { order } = await insertOrder();
      const promote = jest
        .spyOn(PendingCardService.prototype, 'promote')
        .mockRejectedValueOnce(new Error('database unavailable'));
      const errorSpy = jest.spyOn(AppLogger.prototype, 'error');

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect((await orderRow(order.id)).status).toBe('paid');
      expect(await myPaymentCards()).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith(expect.any(String), {
        orderId: order.id,
        paymentId: (await paymentsOf(order.id))[0].id,
      });
      promote.mockRestore();
      errorSpy.mockRestore();
    });

    it('answers a tokenize failure with a generic error and leaves the order pending and unpaid', async () => {
      const { order } = await insertOrder();
      gateway.tokenize.mockRejectedValueOnce(new Error('gateway unavailable'));

      const body = await payOrderWith({
        orderId: order.id,
        card: VALID_CARD,
        saveCard: true,
      });

      expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect((await orderRow(order.id)).status).not.toBe('paid');
      expect(await paymentsOf(order.id)).toHaveLength(0);
      expect(await myPaymentCards()).toEqual([]);
    });
  });

  describe('purchase notification (NOTIF-02, NOTIF-04)', () => {
    const notificationsOf = () =>
      testDbClient(Tables.NotificationsNotification).where({ userId });

    it('stores one unread purchase confirmed for the buyer with the order as its source and the event name (NOTIF-02 AC 2)', async () => {
      const { order } = await insertOrder({
        eventName: 'Coldplay: Music of the Spheres',
      });

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      const rows = await notificationsOf();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        userId,
        type: 'purchase_confirmed',
        channel: 'in_app',
        sourceId: order.id,
        payload: { eventName: 'Coldplay: Music of the Spheres' },
        readAt: null,
      });
    });

    it('stores no purchase notification when the seats were lost and the charge was refunded', async () => {
      const { order, holds } = await insertOrder();
      await testDbClient(Tables.SeatHold).where({ id: holds[0].id }).del();

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      expect(await notificationsOf()).toHaveLength(0);
    });

    it('still answers PAID and logs only the user id, type, and order id when storing fails (NOTIF-04 AC 7, 8)', async () => {
      const { order } = await insertOrder({
        eventName: 'Coldplay: Music of the Spheres',
      });
      jest
        .spyOn(
          NotificationsPublicApiProvider.prototype,
          'notifyPurchaseConfirmed',
        )
        .mockRejectedValueOnce(new Error('notification boom'));
      const errorSpy = jest.spyOn(AppLogger.prototype, 'error');

      const body = await payOrder(order.id);

      expect(body.errors).toBeUndefined();
      expect(body.data.payOrder.status).toBe('PAID');
      expect((await orderRow(order.id)).status).toBe('paid');
      expect(
        await testDbClient(Tables.Ticket).where({ eventId: order.eventId }),
      ).toHaveLength(2);
      expect(await notificationsOf()).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("Couldn't store the notification", {
        userId,
        type: 'purchase_confirmed',
        orderId: order.id,
      });
      errorSpy.mockRestore();
    });
  });

  describe('payment unsuccessful notification (NOTIF-03, NOTIF-04)', () => {
    const notificationsOf = () =>
      testDbClient(Tables.NotificationsNotification).where({ userId });

    it('stores one unread payment unsuccessful with the payment as its source and the event name; a second decline stores a second one (NOTIF-03 AC 3)', async () => {
      const { order } = await insertOrder({
        eventName: 'Coldplay: Music of the Spheres',
      });

      const first = await payOrder(order.id, DECLINED_CARD);

      expect(errorOf(first)?.reason).toBe('CARD_DECLINED');
      const [firstPayment] = await paymentsOf(order.id);
      const afterFirst = await notificationsOf();
      expect(afterFirst).toHaveLength(1);
      expect(afterFirst[0]).toMatchObject({
        userId,
        type: 'payment_unsuccessful',
        channel: 'in_app',
        sourceId: firstPayment.id,
        payload: { eventName: 'Coldplay: Music of the Spheres' },
        readAt: null,
      });

      const second = await payOrder(order.id, DECLINED_CARD);

      expect(errorOf(second)?.reason).toBe('CARD_DECLINED');
      const afterSecond = await notificationsOf();
      expect(afterSecond).toHaveLength(2);
      expect(afterSecond.map((row) => row.sourceId).sort()).toEqual(
        (await paymentsOf(order.id)).map((payment) => payment.id).sort(),
      );
    });

    it('stores one per declined charge of a saved card too (NOTIF-03 AC 3)', async () => {
      const { order } = await insertOrder();
      const savedCard = billingPaymentCardFactory.build({
        userId,
        providerToken: `sim_pm_decline_${randomUUID()}`,
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);

      const body = await payOrderWith({
        orderId: order.id,
        savedCardId: savedCard.id,
      });

      expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
      const rows = await notificationsOf();
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe('payment_unsuccessful');
    });

    it('stores none when the saved card is not found (NOTIF-03 AC 5)', async () => {
      const { order } = await insertOrder();

      const body = await payOrderWith({
        orderId: order.id,
        savedCardId: randomUUID(),
      });

      expect(errorOf(body)?.reason).toBe('CARD_NOT_FOUND');
      expect(await notificationsOf()).toHaveLength(0);
    });

    it('stores none when the gateway throws (NOTIF-03 AC 5)', async () => {
      const { order } = await insertOrder();
      gateway.authorize.mockRejectedValue(new Error('gateway unavailable'));

      const body = await payOrder(order.id);

      expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect(await notificationsOf()).toHaveLength(0);
    });

    it('still answers CARD_DECLINED with the same message, keeps the order payable, and logs only the user id, type, and order id when storing fails (NOTIF-04 AC 7, 8)', async () => {
      const { order } = await insertOrder({
        eventName: 'Coldplay: Music of the Spheres',
      });
      jest
        .spyOn(
          NotificationsPublicApiProvider.prototype,
          'notifyPaymentUnsuccessful',
        )
        .mockRejectedValueOnce(new Error('notification boom'));
      const errorSpy = jest.spyOn(AppLogger.prototype, 'error');

      const declined = await payOrder(order.id, DECLINED_CARD);

      expect(errorOf(declined)?.reason).toBe('CARD_DECLINED');
      expect(errorOf(declined)?.message).toBe(
        'Your card was declined. Try another card.',
      );
      expect(await notificationsOf()).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("Couldn't store the notification", {
        userId,
        type: 'payment_unsuccessful',
        orderId: order.id,
      });
      errorSpy.mockRestore();

      const retried = await payOrder(order.id);

      expect(retried.errors).toBeUndefined();
      expect(retried.data.payOrder.status).toBe('PAID');
    });
  });

  describe('concurrent payments (PAY-45)', () => {
    it('charges once when the same order is paid twice at the same time, 5 times over', async () => {
      for (let round = 0; round < 5; round++) {
        const { order } = await insertOrder();
        gateway.authorize.mockClear();

        const bodies = await Promise.all([
          payOrder(order.id),
          payOrder(order.id),
        ]);

        expect(gateway.authorize).toHaveBeenCalledTimes(1);
        const payments = await paymentsOf(order.id);
        expect(payments).toHaveLength(1);
        expect(payments[0].status).toBe('succeeded');
        const winners = bodies.filter((body) => !body.errors);
        const losers = bodies.filter((body) => body.errors);
        expect(winners).toHaveLength(1);
        expect(winners[0].data.payOrder.status).toBe('PAID');
        expect(losers).toHaveLength(1);
        expect(['ORDER_ALREADY_PAID', 'PAYMENT_IN_PROGRESS']).toContain(
          errorOf(losers[0])?.reason,
        );
      }
    });
  });

  describe('PAY-46: seats lost after the charge are refunded', () => {
    const expectRefundedAndFailed = async (orderId: string) => {
      const payments = await paymentsOf(orderId);
      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe('refunded');
      expect(payments[0].refundedAt).not.toBeNull();
      expect(gateway.refund).toHaveBeenCalledTimes(1);
      expect(gateway.refund).toHaveBeenCalledWith(
        payments[0].providerPaymentId,
        `${payments[0].id}:refund`,
      );
      expect((await orderRow(orderId)).status).toBe('failed');
    };

    it('refunds and fails the order when a hold was deleted after the checkout started', async () => {
      const { order, holds } = await insertOrder();
      await testDbClient(Tables.SeatHold).where({ id: holds[0].id }).del();

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      await expectRefundedAndFailed(order.id);
      expect(await testDbClient(Tables.Ticket)).toHaveLength(0);
      expect(sender.send).not.toHaveBeenCalled();
    });

    it('refunds and fails the order when another user reclaimed a hold after the checkout started', async () => {
      const { order, holds } = await insertOrder();
      const otherUserId = randomUUID();
      await testDbClient(Tables.SeatHold)
        .where({ id: holds[0].id })
        .update({ userId: otherUserId, expiresAt: fromNow(10 * 60_000) });

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      await expectRefundedAndFailed(order.id);
      expect(await testDbClient(Tables.Ticket)).toHaveLength(0);
      const reclaimed = await testDbClient(Tables.SeatHold).where({
        id: holds[0].id,
      });
      expect(reclaimed).toHaveLength(1);
      expect(reclaimed[0].userId).toBe(otherUserId);
      expect(sender.send).not.toHaveBeenCalled();
    });

    it('refunds and fails the order when a seat already has an issued ticket of another order', async () => {
      const { order, items } = await insertOrder();
      const sold = ticketFactory.build({
        eventId: order.eventId,
        seatId: items[0].seatId,
        status: TicketStatus.ISSUED,
      });
      await testDbClient.batchInsert(Tables.Ticket, [sold]);

      const body = await payOrder(order.id);

      expect(errorOf(body)?.reason).toBe('SEATS_UNAVAILABLE');
      await expectRefundedAndFailed(order.id);
      const tickets = await testDbClient(Tables.Ticket);
      expect(tickets.map((ticket) => ticket.id)).toEqual([sold.id]);
      expect(sender.send).not.toHaveBeenCalled();
    });
  });

  describe('ticket code collision', () => {
    const TAKEN_CODE = 'TAKENCODE234';

    // A ticket of another event already owns TAKEN_CODE
    const insertTicketWithTakenCode = async () => {
      const taken = ticketFactory.build({ code: TAKEN_CODE });
      await testDbClient.batchInsert(Tables.Ticket, [taken]);
      return taken;
    };

    const spyOnCodes = () =>
      jest.spyOn(module.get(TicketCodeGenerator), 'generate');

    it('retries the issuance with fresh codes and charges once', async () => {
      const { order } = await insertOrder();
      await insertTicketWithTakenCode();
      const generate = spyOnCodes().mockReturnValueOnce(TAKEN_CODE);

      try {
        const body = await payOrder(order.id);

        expect(body.errors).toBeUndefined();
        expect(body.data.payOrder.status).toBe('PAID');
      } finally {
        generate.mockRestore();
      }
      expect(gateway.authorize).toHaveBeenCalledTimes(1);
      expect(gateway.refund).not.toHaveBeenCalled();
      const payments = await paymentsOf(order.id);
      expect(payments.map((payment) => payment.status)).toEqual(['succeeded']);
      const codes = (await testDbClient(Tables.Ticket).where({ userId })).map(
        (ticket) => ticket.code,
      );
      expect(codes).toHaveLength(2);
      expect(new Set(codes).size).toBe(2);
      expect(codes).not.toContain(TAKEN_CODE);
    });

    it('refunds and fails the order with a generic error when every retry collides', async () => {
      const { order } = await insertOrder();
      const taken = await insertTicketWithTakenCode();
      const generate = spyOnCodes().mockReturnValue(TAKEN_CODE);

      try {
        const body = await payOrder(order.id);

        expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
        expect(errorOf(body)?.reason).toBeUndefined();
      } finally {
        generate.mockRestore();
      }
      expect(gateway.authorize).toHaveBeenCalledTimes(1);
      const payments = await paymentsOf(order.id);
      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe('refunded');
      expect(gateway.refund).toHaveBeenCalledTimes(1);
      expect((await orderRow(order.id)).status).toBe('failed');
      const tickets = await testDbClient(Tables.Ticket);
      expect(tickets.map((ticket) => ticket.id)).toEqual([taken.id]);
    });
  });

  it('frees the seats of an expired pending order, but not a seat sold elsewhere (PAY-63)', async () => {
    const { order, items } = await insertOrder({ expiresAt: fromNow(-1_000) });
    await testDbClient.batchInsert(Tables.Ticket, [
      ticketFactory.build({
        eventId: order.eventId,
        seatId: items[1].seatId,
        status: TicketStatus.ISSUED,
      }),
    ]);

    expect(await findUnavailableSeats(order.eventId)).toEqual([
      items[1].seatId,
    ]);
  });
});
