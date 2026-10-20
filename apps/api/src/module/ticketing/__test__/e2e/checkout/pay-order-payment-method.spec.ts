import { randomUUID } from 'crypto';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
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
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const PAY_ORDER = `
  mutation PayOrder($input: PayOrderInput!) {
    payOrder(input: $input) {
      id
      status
      paymentAction { provider clientSecret }
    }
  }
`;

const CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

// GW-37, GW-38, GW-41 in Stripe mode, with a stub gateway standing in for Stripe
describe('TicketingResolver payOrder with a PaymentMethod (e2e, stub Stripe gateway)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const gateway = {
    provider: 'stripe' as const,
    acceptsTypedCards: false,
    tokenize: jest.fn(),
    attachPaymentMethod: jest.fn(),
    describePaymentMethod: jest.fn(),
    detach: jest.fn(),
    authorize: jest.fn(),
    getPayment: jest.fn(),
    capture: jest.fn(),
    cancel: jest.fn(),
    refund: jest.fn(),
  };
  const sender = { send: jest.fn() };

  const userId = randomUUID();

  const deleteRows = async () => {
    await testDbClient(Tables.Ticket).del();
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.OrderItem).del();
    await testDbClient(Tables.Order).del();
    await testDbClient(Tables.BillingPayment).del();
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
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
    await testDbClient.batchInsert(Tables.IdentityUser, [
      {
        id: userId,
        email: `buyer-${userId}@example.com`,
        passwordHash: 'x'.repeat(60),
      },
    ]);
  });

  beforeEach(async () => {
    await deleteRows();
    gateway.describePaymentMethod.mockResolvedValue({
      brand: 'visa',
      last4: '4242',
    });
    gateway.authorize.mockResolvedValue({
      status: 'authorized',
      providerPaymentId: 'pi_1',
    });
    gateway.capture.mockResolvedValue(undefined);
    gateway.detach.mockResolvedValue(undefined);
    gateway.attachPaymentMethod.mockResolvedValue({
      status: 'succeeded',
      token: 'pm_card_visa',
      customerId: 'cus_1',
      fingerprint: 'b'.repeat(64),
      brand: 'visa',
      last4: '4242',
      expMonth: 6,
      expYear: 2030,
      holder: 'Jane Doe',
    });
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

  const payOrderWith = async (input: Record<string, unknown>) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set(
        'Authorization',
        `Bearer ${jwtService.sign({
          sub: userId,
          sid: randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 900,
        })}`,
      )
      .send({ query: PAY_ORDER, variables: { input } })
      .expect(200);
    return response.body;
  };

  const errorOf = (body: {
    errors?: {
      extensions: { originalError?: { reason?: string; message?: string } };
    }[];
  }) => body.errors?.[0]?.extensions.originalError;

  const insertOrder = async () => {
    const order = orderFactory.build({
      userId,
      expiresAt: new Date(Date.now() + 5 * 60_000),
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
    return order;
  };

  const orderRow = (id: string) =>
    testDbClient(Tables.Order).where({ id }).first();
  const paymentsOf = (orderId: string) =>
    testDbClient(Tables.BillingPayment).where({ orderId });

  it('pays with a PaymentMethod id: authorizes the token, then captures (GW-41)', async () => {
    const order = await insertOrder();

    const body = await payOrderWith({
      orderId: order.id,
      paymentMethodId: 'pm_card_visa',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data.payOrder.status).toBe('PAID');
    expect(gateway.authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { type: 'token', token: 'pm_card_visa' },
      }),
      expect.stringMatching(/:authorize$/),
    );
    expect(gateway.capture).toHaveBeenCalledTimes(1);
    expect(gateway.attachPaymentMethod).not.toHaveBeenCalled();
    const [payment] = await paymentsOf(order.id);
    expect(payment).toMatchObject({
      provider: 'stripe',
      status: 'succeeded',
      cardBrand: 'visa',
      cardLast4: '4242',
    });
    expect(JSON.stringify(payment)).not.toContain('pm_card_visa');
  });

  it('pauses on a 3-D Secure challenge with the Stripe client secret', async () => {
    const order = await insertOrder();
    gateway.authorize.mockResolvedValue({
      status: 'requires_action',
      providerPaymentId: 'pi_2',
      clientSecret: 'pi_2_secret_x',
    });

    const body = await payOrderWith({
      orderId: order.id,
      paymentMethodId: 'pm_card_threeDSecure2Required',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data.payOrder).toMatchObject({
      status: 'REQUIRES_ACTION',
      paymentAction: { provider: 'stripe', clientSecret: 'pi_2_secret_x' },
    });
    expect(gateway.capture).not.toHaveBeenCalled();
    expect((await orderRow(order.id)).status).toBe('requires_action');
  });

  it('saves the card after capture when asked to (GW-37)', async () => {
    const order = await insertOrder();

    const body = await payOrderWith({
      orderId: order.id,
      paymentMethodId: 'pm_card_visa',
      saveCard: true,
    });

    expect(body.data.payOrder.status).toBe('PAID');
    expect(gateway.attachPaymentMethod).toHaveBeenCalledWith(
      'pm_card_visa',
      userId,
    );
    expect(gateway.authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { type: 'token', token: 'pm_card_visa', customerId: 'cus_1' },
      }),
      expect.any(String),
    );
    const cards = await testDbClient(Tables.BillingPaymentCard).where({
      userId,
    });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      provider: 'stripe',
      customerId: 'cus_1',
      last4: '4242',
    });
  });

  it('refuses a typed card with INVALID_CARD before any gateway call (GW-38)', async () => {
    const order = await insertOrder();

    const body = await payOrderWith({ orderId: order.id, card: CARD });

    expect(errorOf(body)).toMatchObject({
      reason: 'INVALID_CARD',
      message: 'Choose a payment method.',
    });
    expect(gateway.describePaymentMethod).not.toHaveBeenCalled();
    expect(gateway.attachPaymentMethod).not.toHaveBeenCalled();
    expect(gateway.tokenize).not.toHaveBeenCalled();
    expect(gateway.authorize).not.toHaveBeenCalled();
    expect(await paymentsOf(order.id)).toHaveLength(0);
    expect((await orderRow(order.id)).status).toBe('pending');
  });

  it('refuses two sources at once with INVALID_CARD', async () => {
    const order = await insertOrder();

    const body = await payOrderWith({
      orderId: order.id,
      card: CARD,
      paymentMethodId: 'pm_card_visa',
    });

    expect(errorOf(body)?.reason).toBe('INVALID_CARD');
    expect(gateway.authorize).not.toHaveBeenCalled();
  });

  it('answers a decline with CARD_DECLINED and leaves the order payable', async () => {
    const order = await insertOrder();
    gateway.authorize.mockResolvedValue({
      status: 'failed',
      reason: 'card_declined',
    });

    const body = await payOrderWith({
      orderId: order.id,
      paymentMethodId: 'pm_card_chargeDeclined',
    });

    expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
    expect((await orderRow(order.id)).status).toBe('pending');
    expect(gateway.capture).not.toHaveBeenCalled();
  });
});
