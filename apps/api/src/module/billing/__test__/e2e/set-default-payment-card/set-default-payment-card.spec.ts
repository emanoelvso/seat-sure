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

const SET_DEFAULT_PAYMENT_CARD = `
  mutation SetDefaultPaymentCard($input: PaymentCardIdInput!) {
    setDefaultPaymentCard(input: $input) {
      id
      isDefault
    }
  }
`;

interface ErrorBody {
  errors?: Array<{
    extensions: { originalError?: { reason?: string } };
  }>;
}

describe('BillingResolver setDefaultPaymentCard (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  // The caller's three cards: the default A, then B and C, oldest first
  const cardA = billingPaymentCardFactory.build({
    userId,
    isDefault: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });
  const cardB = billingPaymentCardFactory.build({
    userId,
    createdAt: new Date('2026-02-01T00:00:00Z'),
  });
  const cardC = billingPaymentCardFactory.build({
    userId,
    createdAt: new Date('2026-03-01T00:00:00Z'),
  });
  const foreignCard = billingPaymentCardFactory.build({
    userId: otherUserId,
    isDefault: true,
  });

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
    await testDbClient(Tables.BillingPaymentCard).insert([
      cardA,
      cardB,
      cardC,
      foreignCard,
    ]);
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

  const setDefault = async (id: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: SET_DEFAULT_PAYMENT_CARD, variables: { input: { id } } })
      .expect(200);
    return response.body;
  };

  const errorOf = (body: ErrorBody) =>
    body.errors?.[0]?.extensions.originalError;

  const rows = () =>
    testDbClient(Tables.BillingPaymentCard)
      .select('id', 'userId', 'isDefault', 'updatedAt')
      .orderBy('id');

  const defaultIdsOf = async (id: string) =>
    (
      await testDbClient(Tables.BillingPaymentCard).where({
        userId: id,
        isDefault: true,
      })
    ).map((row) => row.id);

  it('moves the default to the card and returns the list with it first (CARD-10 AC 4)', async () => {
    const body = await setDefault(cardC.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.setDefaultPaymentCard).toEqual([
      { id: cardC.id, isDefault: true },
      { id: cardA.id, isDefault: false },
      { id: cardB.id, isDefault: false },
    ]);
    expect(await defaultIdsOf(userId)).toEqual([cardC.id]);
  });

  it("leaves another user's default alone", async () => {
    await setDefault(cardB.id, tokenFor(userId));

    expect(await defaultIdsOf(otherUserId)).toEqual([foreignCard.id]);
  });

  it('changes nothing when the card is already the default', async () => {
    const before = await rows();

    const body = await setDefault(cardA.id, tokenFor(userId));

    expect(body.data.setDefaultPaymentCard).toEqual([
      { id: cardA.id, isDefault: true },
      { id: cardB.id, isDefault: false },
      { id: cardC.id, isDefault: false },
    ]);
    expect(await rows()).toEqual(before);
  });

  it('gives the same result when repeated', async () => {
    const first = await setDefault(cardB.id, tokenFor(userId));
    const second = await setDefault(cardB.id, tokenFor(userId));

    expect(second.data.setDefaultPaymentCard).toEqual(
      first.data.setDefaultPaymentCard,
    );
    expect(await defaultIdsOf(userId)).toEqual([cardB.id]);
  });

  describe('CARD_NOT_FOUND, with no change (CARD-11 AC 10)', () => {
    it.each([
      ["another user's card", () => foreignCard.id],
      ['an unknown id', () => randomUUID()],
      ['a malformed id', () => 'not-a-uuid'],
    ])('for %s', async (_label, idOf) => {
      const before = await rows();

      const body = await setDefault(idOf(), tokenFor(userId));

      expect(errorOf(body)?.reason).toBe('CARD_NOT_FOUND');
      expect(body.data).toBeNull();
      expect(await rows()).toEqual(before);
    });
  });

  it('leaves exactly one default when two set-defaults race (edge case)', async () => {
    const token = tokenFor(userId);

    const results = await Promise.all([
      setDefault(cardB.id, token),
      setDefault(cardC.id, token),
    ]);

    expect(results.map((body) => body.errors)).toEqual([undefined, undefined]);
    const defaults = await defaultIdsOf(userId);
    expect(defaults).toHaveLength(1);
    expect([cardB.id, cardC.id]).toContain(defaults[0]);
  });

  it('responds UNAUTHENTICATED without a token and changes nothing (CARD-11 AC 12)', async () => {
    const before = await rows();

    const body = await setDefault(cardB.id);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    expect(await rows()).toEqual(before);
  });
});
