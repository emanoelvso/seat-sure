import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingModule } from '@billingModule/billing.module';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const ADD_PAYMENT_METHOD = `
  mutation AddPaymentMethod($input: AddPaymentMethodInput!) {
    addPaymentMethod(input: $input) { id brand last4 holder isDefault }
  }
`;
const ADD_PAYMENT_CARD = `
  mutation AddPaymentCard($input: AddPaymentCardInput!) {
    addPaymentCard(input: $input) { id }
  }
`;

const attached = (overrides = {}) => ({
  status: 'succeeded' as const,
  token: 'pm_card_visa',
  customerId: 'cus_1',
  fingerprint: 'a'.repeat(64),
  brand: 'visa',
  last4: '4242',
  expMonth: 6,
  expYear: 2030,
  holder: 'Jane Doe',
  ...overrides,
});

const CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

// GW-37, GW-38 in Stripe mode, with a stub gateway standing in for Stripe
describe('BillingResolver addPaymentMethod (e2e, stub Stripe gateway)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  const userId = randomUUID();

  const gateway = {
    provider: 'stripe' as const,
    acceptsTypedCards: false,
    tokenize: jest.fn(),
    attachPaymentMethod: jest.fn(),
    detach: jest.fn(),
    describePaymentMethod: jest.fn(),
    authorize: jest.fn(),
    getPayment: jest.fn(),
    capture: jest.fn(),
    cancel: jest.fn(),
    refund: jest.fn(),
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, BillingModule],
    })
      .overrideProvider(PaymentGateway)
      .useValue(gateway)
      .compile();
    app = module.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
    gateway.attachPaymentMethod.mockResolvedValue(attached());
    gateway.detach.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  const call = async (query: string, input: Record<string, unknown>) => {
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
      .send({ query, variables: { input } })
      .expect(200);
    return response.body;
  };
  const reasonOf = (body: {
    errors?: { extensions: { originalError?: { reason?: string } } }[];
  }) => body.errors?.[0]?.extensions.originalError?.reason;

  it('saves the attached card as the first, default card of the stripe provider', async () => {
    const body = await call(ADD_PAYMENT_METHOD, {
      paymentMethodId: 'pm_card_visa',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data.addPaymentMethod).toEqual([
      expect.objectContaining({
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        isDefault: true,
      }),
    ]);
    expect(gateway.attachPaymentMethod).toHaveBeenCalledWith(
      'pm_card_visa',
      userId,
    );
    const rows = await testDbClient(Tables.BillingPaymentCard).where({
      userId,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: 'stripe',
      providerToken: 'pm_card_visa',
      customerId: 'cus_1',
    });
    expect(JSON.stringify(body)).not.toContain('pm_card_visa');
  });

  it('answers CARD_DECLINED when Stripe declines the attach, and counts the failure', async () => {
    gateway.attachPaymentMethod.mockResolvedValue({
      status: 'failed',
      reason: 'card_declined',
    });

    const body = await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_bad' });

    expect(reasonOf(body)).toBe('CARD_DECLINED');
    const [throttle] = await testDbClient(Tables.BillingCardThrottle).where({
      userId,
    });
    expect(throttle.failedCount).toBe(1);
    expect(await testDbClient(Tables.BillingPaymentCard)).toHaveLength(0);
  });

  it('answers DUPLICATE_CARD for a card already saved and detaches the new method', async () => {
    await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_card_visa' });
    gateway.attachPaymentMethod.mockResolvedValue(attached({ token: 'pm_2' }));

    const body = await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_2' });

    expect(reasonOf(body)).toBe('DUPLICATE_CARD');
    expect(gateway.detach).toHaveBeenCalledWith('pm_2');
    expect(await testDbClient(Tables.BillingPaymentCard)).toHaveLength(1);
  });

  it('still answers DUPLICATE_CARD when the cleanup detach throws, and logs the user id without the token (CLN-01)', async () => {
    await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_card_visa' });
    gateway.attachPaymentMethod.mockResolvedValue(attached({ token: 'pm_2' }));
    gateway.detach.mockRejectedValue(new Error('gateway refused pm_2'));
    const errorSpy = jest
      .spyOn(AppLogger.prototype, 'error')
      .mockImplementation(() => undefined);

    const body = await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_2' });

    expect(reasonOf(body)).toBe('DUPLICATE_CARD');
    expect(await testDbClient(Tables.BillingPaymentCard)).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][1]).toEqual({ userId });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('pm_2');
    errorSpy.mockRestore();
  });

  it('is throttled like addPaymentCard: five failures lock it before the gateway', async () => {
    gateway.attachPaymentMethod.mockResolvedValue({
      status: 'failed',
      reason: 'card_declined',
    });
    for (let i = 0; i < 5; i++) {
      await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_bad' });
    }
    gateway.attachPaymentMethod.mockClear();

    const body = await call(ADD_PAYMENT_METHOD, { paymentMethodId: 'pm_bad' });

    expect(reasonOf(body)).toBe('CARD_ATTEMPTS_LIMITED');
    expect(gateway.attachPaymentMethod).not.toHaveBeenCalled();
  });

  it('refuses a typed card with INVALID_CARD before any gateway call (GW-38)', async () => {
    const body = await call(ADD_PAYMENT_CARD, CARD);

    expect(reasonOf(body)).toBe('INVALID_CARD');
    expect(body.errors[0].message).toContain('Choose a payment method.');
    expect(gateway.tokenize).not.toHaveBeenCalled();
    expect(gateway.attachPaymentMethod).not.toHaveBeenCalled();
  });
});
