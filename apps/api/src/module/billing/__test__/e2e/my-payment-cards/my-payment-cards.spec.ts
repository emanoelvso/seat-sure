import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { BillingModule } from '@billingModule/billing.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const MY_PAYMENT_CARDS = `
  query MyPaymentCards {
    myPaymentCards {
      id
      brand
      last4
      expMonth
      expYear
      holder
      isDefault
      expired
    }
  }
`;

const PAYMENT_CARD_FIELDS = `
  query PaymentCardFields {
    __type(name: "PaymentCard") {
      fields {
        name
      }
    }
  }
`;

// The UTC month `offset` months from now, as { expMonth, expYear }
const monthFromNow = (offset: number) => {
  const now = new Date();
  const index = now.getUTCFullYear() * 12 + now.getUTCMonth() + offset;
  return { expMonth: (index % 12) + 1, expYear: Math.floor(index / 12) };
};

describe('BillingResolver myPaymentCards (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
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

  const graphql = async (query: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call.send({ query }).expect(200);
    return response.body;
  };

  it("returns the caller's cards with their display fields, default first, then oldest (CARD-01 AC 3, 4)", async () => {
    const oldest = billingPaymentCardFactory.build({
      userId,
      brand: 'mastercard',
      last4: '4444',
      expMonth: 8,
      expYear: 2030,
      holder: 'Ada Lovelace',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newer = billingPaymentCardFactory.build({
      userId,
      brand: 'amex',
      last4: '0005',
      expMonth: 1,
      expYear: 2031,
      holder: 'Grace Hopper',
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    const defaultCard = billingPaymentCardFactory.build({
      userId,
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2029,
      holder: 'Alan Turing',
      isDefault: true,
      createdAt: new Date('2026-03-01T00:00:00Z'),
    });
    await testDbClient(Tables.BillingPaymentCard).insert([
      newer,
      defaultCard,
      oldest,
    ]);

    const body = await graphql(MY_PAYMENT_CARDS, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.myPaymentCards).toEqual([
      {
        id: defaultCard.id,
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2029,
        holder: 'Alan Turing',
        isDefault: true,
        expired: false,
      },
      {
        id: oldest.id,
        brand: 'mastercard',
        last4: '4444',
        expMonth: 8,
        expYear: 2030,
        holder: 'Ada Lovelace',
        isDefault: false,
        expired: false,
      },
      {
        id: newer.id,
        brand: 'amex',
        last4: '0005',
        expMonth: 1,
        expYear: 2031,
        holder: 'Grace Hopper',
        isDefault: false,
        expired: false,
      },
    ]);
  });

  it("never returns another user's cards: each token sees its own (CARD-02 AC 9)", async () => {
    const mine = billingPaymentCardFactory.build({ userId, isDefault: true });
    const theirs = billingPaymentCardFactory.build({
      userId: otherUserId,
      isDefault: true,
    });
    await testDbClient(Tables.BillingPaymentCard).insert([mine, theirs]);

    const myBody = await graphql(MY_PAYMENT_CARDS, tokenFor(userId));
    const theirBody = await graphql(MY_PAYMENT_CARDS, tokenFor(otherUserId));

    expect(
      myBody.data.myPaymentCards.map((card: { id: string }) => card.id),
    ).toEqual([mine.id]);
    expect(
      theirBody.data.myPaymentCards.map((card: { id: string }) => card.id),
    ).toEqual([theirs.id]);
  });

  it('returns [] for a user with no cards', async () => {
    await testDbClient(Tables.BillingPaymentCard).insert(
      billingPaymentCardFactory.build({
        userId: otherUserId,
        isDefault: true,
      }),
    );

    const body = await graphql(MY_PAYMENT_CARDS, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.myPaymentCards).toEqual([]);
  });

  it('marks a card expired only when its expiry month is before the current UTC month (CARD-01 AC 6)', async () => {
    const lastMonth = billingPaymentCardFactory.build({
      userId,
      isDefault: true,
      ...monthFromNow(-1),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const thisMonth = billingPaymentCardFactory.build({
      userId,
      ...monthFromNow(0),
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    const nextMonth = billingPaymentCardFactory.build({
      userId,
      ...monthFromNow(1),
      createdAt: new Date('2026-03-01T00:00:00Z'),
    });
    await testDbClient(Tables.BillingPaymentCard).insert([
      lastMonth,
      thisMonth,
      nextMonth,
    ]);

    const body = await graphql(MY_PAYMENT_CARDS, tokenFor(userId));

    expect(
      body.data.myPaymentCards.map((card: { id: string; expired: boolean }) => [
        card.id,
        card.expired,
      ]),
    ).toEqual([
      [lastMonth.id, true],
      [thisMonth.id, false],
      [nextMonth.id, false],
    ]);
  });

  it('exposes no token or fingerprint on PaymentCard (CARD-02 AC 10)', async () => {
    const body = await graphql(PAYMENT_CARD_FIELDS);

    const names = body.data.__type.fields.map(
      (field: { name: string }) => field.name,
    );
    expect([...names].sort()).toEqual(
      [
        'brand',
        'expMonth',
        'expYear',
        'expired',
        'holder',
        'id',
        'isDefault',
        'last4',
      ].sort(),
    );
  });

  it('never sends the stored token or fingerprint in the response (CARD-02 AC 10)', async () => {
    const card = billingPaymentCardFactory.build({ userId, isDefault: true });
    await testDbClient(Tables.BillingPaymentCard).insert(card);

    const body = await graphql(MY_PAYMENT_CARDS, tokenFor(userId));

    const raw = JSON.stringify(body);
    expect(raw).not.toContain(card.providerToken);
    expect(raw).not.toContain(card.fingerprint);
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    await testDbClient(Tables.BillingPaymentCard).insert(
      billingPaymentCardFactory.build({ userId, isDefault: true }),
    );

    const body = await graphql(MY_PAYMENT_CARDS);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
  });
});
