import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const ADD_PAYMENT_CARD = `
  mutation AddPaymentCard($input: AddPaymentCardInput!) {
    addPaymentCard(input: $input) { id }
  }
`;
const MY_PAYMENT_CARDS = `query MyPaymentCards { myPaymentCards { id } }`;
const SET_DEFAULT = `
  mutation SetDefault($input: PaymentCardIdInput!) {
    setDefaultPaymentCard(input: $input) { id isDefault }
  }
`;
const REMOVE = `
  mutation Remove($input: PaymentCardIdInput!) {
    removePaymentCard(input: $input) { id }
  }
`;

const VISA = {
  number: '4242 4242 4242 4242',
  holder: 'Ada Lovelace',
  expiry: '08/30',
  cvv: '123',
};
const MASTERCARD = {
  number: '5555 5555 5555 4444',
  holder: 'Grace Hopper',
  expiry: '01/31',
  cvv: '456',
};
const DECLINED = { ...VISA, number: '4000 0000 0000 0002' };
const INVALID = { ...VISA, number: '1' };

interface Body {
  data: unknown;
  errors?: Array<{
    extensions: { originalError?: { reason?: string } };
  }>;
}

// CARDABUSE-01, CARDABUSE-02: addPaymentCard throttle (AD-028)
describe('BillingResolver addPaymentCard throttle (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let gateway: PaymentGateway;
  let paymentCardService: PaymentCardService;
  let userId: string;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
    gateway = module.get<PaymentGateway>(PaymentGateway);
    paymentCardService = module.get(PaymentCardService);
  });

  beforeEach(async () => {
    userId = randomUUID();
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingCardThrottle).del();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const send = async (
    query: string,
    variables: Record<string, unknown>,
    id = userId,
  ): Promise<Body> => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${tokenFor(id)}`)
      .send({ query, variables })
      .expect(200);
    return response.body;
  };

  const add = (card: Record<string, string>, id = userId) =>
    send(ADD_PAYMENT_CARD, { input: card }, id);

  const reasonOf = (body: Body) =>
    body.errors?.[0]?.extensions.originalError?.reason;

  const failures = (id = userId) =>
    testDbClient(Tables.BillingCardThrottle)
      .where({ userId: id })
      .first()
      .then((row) => (row ? Number(row.failedCount) : 0));

  const lockOut = async (id = userId) => {
    for (let i = 0; i < 5; i += 1) {
      expect(reasonOf(await add(DECLINED, id))).toBe('CARD_DECLINED');
    }
  };

  it('rejects the 6th add after 5 declines with CARD_ATTEMPTS_LIMITED and never calls the gateway (AC 1, 6)', async () => {
    await lockOut();
    const tokenize = jest.spyOn(gateway, 'tokenize');

    const body = await add(VISA);

    expect(reasonOf(body)).toBe('CARD_ATTEMPTS_LIMITED');
    expect(body.data).toBeNull();
    expect(tokenize).not.toHaveBeenCalled();
    expect(
      await testDbClient(Tables.BillingPaymentCard).where({ userId }),
    ).toHaveLength(0);
  });

  it('counts INVALID_CARD as a failure (AC 6)', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect(reasonOf(await add(INVALID))).toBe('INVALID_CARD');
    }

    expect(reasonOf(await add(VISA))).toBe('CARD_ATTEMPTS_LIMITED');
  });

  it('does not count DUPLICATE_CARD or CARD_LIMIT_REACHED (AC 8)', async () => {
    await add(VISA);
    for (let i = 0; i < 6; i += 1) {
      expect(reasonOf(await add(VISA))).toBe('DUPLICATE_CARD');
    }
    expect(await failures()).toBe(0);

    await testDbClient(Tables.BillingPaymentCard).insert(
      billingPaymentCardFactory.buildList(4, { userId, last4: '0001' }),
    );
    for (let i = 0; i < 6; i += 1) {
      expect(reasonOf(await add(MASTERCARD))).toBe('CARD_LIMIT_REACHED');
    }
    expect(await failures()).toBe(0);
  });

  it('does not count an unexpected gateway error (edge case)', async () => {
    jest
      .spyOn(gateway, 'tokenize')
      .mockRejectedValue(new Error('gateway down'));

    await add(VISA);

    expect(await failures()).toBe(0);
  });

  it('resets the count on a successful add (AC 5)', async () => {
    for (let i = 0; i < 4; i += 1) {
      await add(DECLINED);
    }
    expect(await failures()).toBe(4);

    expect(reasonOf(await add(VISA))).toBeUndefined();
    expect(await failures()).toBe(0);

    for (let i = 0; i < 4; i += 1) {
      await add(DECLINED);
    }
    expect(reasonOf(await add(MASTERCARD))).toBeUndefined();
  });

  it('accepts adds again 15 minutes after the lock began (AC 4)', async () => {
    await lockOut();
    const lockedUntil = new Date(
      (await testDbClient(Tables.BillingCardThrottle).where({ userId }).first())
        .lockedUntil,
    );

    await expect(
      paymentCardService.add(
        userId,
        VISA,
        new Date(lockedUntil.getTime() - 1000),
      ),
    ).rejects.toMatchObject({ reason: 'CARD_ATTEMPTS_LIMITED' });

    const cards = await paymentCardService.add(userId, VISA, lockedUntil);

    expect(cards).toHaveLength(1);
  });

  it("keeps another user's adds working while one is locked (AC 9)", async () => {
    await lockOut();

    const body = await add(VISA, randomUUID());

    expect(reasonOf(body)).toBeUndefined();
    expect(body.data).not.toBeNull();
  });

  it('still lists, sets the default of, and removes cards while locked (AC 3)', async () => {
    const [first, second] = billingPaymentCardFactory.buildList(2, {
      userId,
      last4: '0001',
    });
    first.isDefault = true;
    await testDbClient(Tables.BillingPaymentCard).insert([first, second]);
    await lockOut();

    const list = await send(MY_PAYMENT_CARDS, {});
    expect(
      (list.data as { myPaymentCards: unknown[] }).myPaymentCards,
    ).toHaveLength(2);

    const setDefault = await send(SET_DEFAULT, { input: { id: second.id } });
    expect(setDefault.errors).toBeUndefined();

    const removed = await send(REMOVE, { input: { id: first.id } });
    expect(removed.errors).toBeUndefined();
    expect(
      (removed.data as { removePaymentCard: unknown[] }).removePaymentCard,
    ).toHaveLength(1);
  });
});
