import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const REMOVE_PAYMENT_CARD = `
  mutation RemovePaymentCard($input: PaymentCardIdInput!) {
    removePaymentCard(input: $input) {
      id
      isDefault
    }
  }
`;

const ADD_PAYMENT_CARD = `
  mutation AddPaymentCard($input: AddPaymentCardInput!) {
    addPaymentCard(input: $input) {
      id
      last4
      isDefault
    }
  }
`;

const VISA = {
  number: '4242 4242 4242 4242',
  holder: 'Ada Lovelace',
  expiry: '08/30',
  cvv: '123',
};

interface ErrorBody {
  errors?: Array<{
    extensions: { originalError?: { reason?: string } };
  }>;
}

describe('BillingResolver removePaymentCard (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let gateway: PaymentGateway;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  // The caller's three cards: the default B, then A and C, oldest first
  const cardA = billingPaymentCardFactory.build({
    userId,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });
  const cardB = billingPaymentCardFactory.build({
    userId,
    isDefault: true,
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
    gateway = module.get<PaymentGateway>(PaymentGateway);
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingPaymentCard).del();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  const seed = () =>
    testDbClient(Tables.BillingPaymentCard).insert([
      cardA,
      cardB,
      cardC,
      foreignCard,
    ]);

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const graphql = async (
    query: string,
    variables: Record<string, unknown>,
    token?: string,
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call.send({ query, variables }).expect(200);
    return response.body;
  };

  const remove = (id: string, token?: string) =>
    graphql(REMOVE_PAYMENT_CARD, { input: { id } }, token);

  const errorOf = (body: ErrorBody) =>
    body.errors?.[0]?.extensions.originalError;

  const rows = () =>
    testDbClient(Tables.BillingPaymentCard)
      .select('id', 'userId', 'isDefault', 'updatedAt')
      .orderBy('id');

  it('removes a non-default card and returns the rest (CARD-10 AC 7)', async () => {
    await seed();

    const body = await remove(cardC.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.removePaymentCard).toEqual([
      { id: cardB.id, isDefault: true },
      { id: cardA.id, isDefault: false },
    ]);
    expect(
      await testDbClient(Tables.BillingPaymentCard).where({ id: cardC.id }),
    ).toEqual([]);
  });

  it('promotes the oldest remaining card when the default is removed (CARD-10 AC 8)', async () => {
    await seed();

    const body = await remove(cardB.id, tokenFor(userId));

    expect(body.data.removePaymentCard).toEqual([
      { id: cardA.id, isDefault: true },
      { id: cardC.id, isDefault: false },
    ]);
    expect(
      (
        await testDbClient(Tables.BillingPaymentCard).where({
          userId,
          isDefault: true,
        })
      ).map((row) => row.id),
    ).toEqual([cardA.id]);
  });

  it('returns [] when the last card is removed (CARD-10 AC 9)', async () => {
    const only = billingPaymentCardFactory.build({ userId, isDefault: true });
    await testDbClient(Tables.BillingPaymentCard).insert(only);

    const body = await remove(only.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.removePaymentCard).toEqual([]);
  });

  it('lets the same number be saved again after removing it (hard delete)', async () => {
    const added = await graphql(
      ADD_PAYMENT_CARD,
      { input: VISA },
      tokenFor(userId),
    );
    const cardId = added.data.addPaymentCard[0].id;

    await remove(cardId, tokenFor(userId));
    const readded = await graphql(
      ADD_PAYMENT_CARD,
      { input: VISA },
      tokenFor(userId),
    );

    expect(readded.errors).toBeUndefined();
    expect(readded.data.addPaymentCard).toEqual([
      { id: expect.any(String), last4: '4242', isDefault: true },
    ]);
    expect(
      await testDbClient(Tables.BillingPaymentCard)
        .where({ id: cardId })
        .whereNotNull('deletedAt'),
    ).toEqual([]);
  });

  it('detaches the token after the delete is committed', async () => {
    await seed();
    const rowsSeenByDetach: unknown[] = [];
    const detach = jest
      .spyOn(gateway, 'detach')
      .mockImplementation(async () => {
        rowsSeenByDetach.push(
          ...(await testDbClient(Tables.BillingPaymentCard).where({
            id: cardC.id,
          })),
        );
      });

    await remove(cardC.id, tokenFor(userId));

    expect(detach).toHaveBeenCalledTimes(1);
    expect(detach).toHaveBeenCalledWith(cardC.providerToken);
    expect(rowsSeenByDetach).toEqual([]);
  });

  it('still succeeds and logs without the token when detach fails (CARD-06 AC 17)', async () => {
    await seed();
    jest
      .spyOn(gateway, 'detach')
      .mockRejectedValue(new Error(`gateway refused ${cardC.providerToken}`));
    const errorSpy = jest
      .spyOn(AppLogger.prototype, 'error')
      .mockImplementation(() => undefined);

    const body = await remove(cardC.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.removePaymentCard).toEqual([
      { id: cardB.id, isDefault: true },
      { id: cardA.id, isDefault: false },
    ]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][1]).toEqual({ cardId: cardC.id });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      cardC.providerToken,
    );
  });

  describe('CARD_NOT_FOUND, with no change (CARD-11 AC 10)', () => {
    it.each([
      ["another user's card", () => foreignCard.id],
      ['an unknown id', () => randomUUID()],
      ['a malformed id', () => 'not-a-uuid'],
    ])('for %s', async (_label, idOf) => {
      await seed();
      const detach = jest.spyOn(gateway, 'detach');
      const before = await rows();

      const body = await remove(idOf(), tokenFor(userId));

      expect(errorOf(body)?.reason).toBe('CARD_NOT_FOUND');
      expect(body.data).toBeNull();
      expect(await rows()).toEqual(before);
      expect(detach).not.toHaveBeenCalled();
    });

    it('for a card already removed', async () => {
      await seed();
      await remove(cardC.id, tokenFor(userId));

      const body = await remove(cardC.id, tokenFor(userId));

      expect(errorOf(body)?.reason).toBe('CARD_NOT_FOUND');
    });
  });

  it('responds UNAUTHENTICATED without a token and changes nothing (CARD-11 AC 12)', async () => {
    await seed();
    const before = await rows();

    const body = await remove(cardA.id);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    expect(await rows()).toEqual(before);
  });
});
