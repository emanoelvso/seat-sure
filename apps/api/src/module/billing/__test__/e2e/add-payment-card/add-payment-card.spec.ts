import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { BillingModule } from '@billingModule/billing.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const ADD_PAYMENT_CARD = `
  mutation AddPaymentCard($input: AddPaymentCardInput!) {
    addPaymentCard(input: $input) {
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

type Card = typeof VISA;

interface ErrorBody {
  data: unknown;
  errors?: Array<{
    extensions: {
      code?: string;
      originalError?: { reason?: string; fields?: Record<string, string> };
    };
  }>;
}

describe('BillingResolver addPaymentCard (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let gateway: PaymentGateway;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
    gateway = module.get<PaymentGateway>(PaymentGateway);
  });

  // The token the gateway handed out for the add under test
  const issuedToken = async (tokenize: jest.SpyInstance) => {
    const outcome = await (tokenize.mock.results[
      tokenize.mock.results.length - 1
    ]?.value as Promise<{
      token?: string;
    }>);
    return outcome.token;
  };

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

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const addPaymentCard = async (card: Card, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: ADD_PAYMENT_CARD, variables: { input: card } })
      .expect(200);
    return response.body;
  };

  const errorOf = (body: ErrorBody) =>
    body.errors?.[0]?.extensions.originalError;

  const storedRows = (id = userId) =>
    testDbClient(Tables.BillingPaymentCard)
      .where({ userId: id })
      .orderBy('createdAt', 'asc');

  describe('a valid card', () => {
    it('saves it and returns the list with the new card as the default when it is the first (CARD-03 AC 2, 4)', async () => {
      const detach = jest.spyOn(gateway, 'detach');

      const body = await addPaymentCard(VISA, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.addPaymentCard).toEqual([
        {
          id: expect.any(String),
          brand: 'visa',
          last4: '4242',
          expMonth: 8,
          expYear: 2030,
          holder: 'Ada Lovelace',
          isDefault: true,
          expired: false,
        },
      ]);
      expect(detach).not.toHaveBeenCalled();
      const rows = await storedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: body.data.addPaymentCard[0].id,
        provider: 'simulated',
        providerToken: expect.stringMatching(/^sim_pm_/),
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        brand: 'visa',
        last4: '4242',
        expMonth: 8,
        expYear: 2030,
        holder: 'Ada Lovelace',
        isDefault: true,
      });
    });

    it('stores the holder trimmed', async () => {
      const body = await addPaymentCard(
        { ...VISA, holder: '  Ada Lovelace  ' },
        tokenFor(userId),
      );

      expect(body.data.addPaymentCard[0].holder).toBe('Ada Lovelace');
      expect((await storedRows())[0].holder).toBe('Ada Lovelace');
    });

    it('leaves the existing default when a later card is saved (CARD-03 AC 5)', async () => {
      const first = await addPaymentCard(VISA, tokenFor(userId));
      const firstId = first.data.addPaymentCard[0].id;

      const body = await addPaymentCard(MASTERCARD, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(
        body.data.addPaymentCard.map(
          (card: { id: string; last4: string; isDefault: boolean }) => [
            card.id,
            card.last4,
            card.isDefault,
          ],
        ),
      ).toEqual([
        [firstId, '4242', true],
        [expect.any(String), '4444', false],
      ]);
      expect(body.data.addPaymentCard[1]).toMatchObject({
        brand: 'mastercard',
        holder: 'Grace Hopper',
        expMonth: 1,
        expYear: 2031,
      });
    });

    it('stores no column equal to the number or the CVV, and returns no token (CARD-06 AC 17)', async () => {
      const body = await addPaymentCard(VISA, tokenFor(userId));

      const [row] = await storedRows();
      const values = Object.values(row).map((value) => String(value));
      for (const value of values) {
        expect(value).not.toContain('4242424242424242');
        expect(value).not.toContain('4242 4242 4242 4242');
        expect(value).not.toBe('123');
      }
      const raw = JSON.stringify(body);
      expect(raw).not.toContain(row.providerToken);
      expect(raw).not.toContain(row.fingerprint);
    });
  });

  describe('INVALID_CARD (CARD-04 AC 8)', () => {
    it.each([
      [
        'number',
        { ...VISA, number: '4242 4242 4242 4241' },
        'Enter a valid card number',
      ],
      ['holder', { ...VISA, holder: ' ' }, 'Enter the name on the card'],
      ['expiry', { ...VISA, expiry: '01/20' }, 'Enter a valid expiry date'],
      ['cvv', { ...VISA, cvv: '12' }, 'Enter a valid CVV'],
    ])(
      'rejects a bad %s with only that field and its message, storing nothing',
      async (field, card, message) => {
        const body = await addPaymentCard(card, tokenFor(userId));

        const error = errorOf(body);
        expect(error?.reason).toBe('INVALID_CARD');
        expect(error?.fields).toEqual({ [field]: message });
        expect(body.data).toBeNull();
        expect(await storedRows()).toHaveLength(0);
      },
    );
  });

  describe('DUPLICATE_CARD (CARD-04 AC 9)', () => {
    it('rejects the same number again with fields.number "This card is already saved."', async () => {
      await addPaymentCard(VISA, tokenFor(userId));
      const tokenize = jest.spyOn(gateway, 'tokenize');
      const detach = jest.spyOn(gateway, 'detach');

      const body = await addPaymentCard(
        { ...VISA, number: '4242424242424242', holder: 'Someone Else' },
        tokenFor(userId),
      );

      const error = errorOf(body);
      expect(error?.reason).toBe('DUPLICATE_CARD');
      expect(error?.fields).toEqual({ number: 'This card is already saved.' });
      expect(await storedRows()).toHaveLength(1);
      // The rejected add must not leave its token at the gateway
      expect(detach).toHaveBeenCalledTimes(1);
      expect(detach).toHaveBeenCalledWith(await issuedToken(tokenize));
    });

    it('allows the same number for another user', async () => {
      await addPaymentCard(VISA, tokenFor(otherUserId));

      const body = await addPaymentCard(VISA, tokenFor(userId));

      expect(body.errors).toBeUndefined();
      expect(body.data.addPaymentCard).toHaveLength(1);
      expect(await storedRows(userId)).toHaveLength(1);
      expect(await storedRows(otherUserId)).toHaveLength(1);
    });

    it('saves a double submit once (edge case)', async () => {
      const token = tokenFor(userId);

      const results = await Promise.all([
        addPaymentCard(VISA, token),
        addPaymentCard(VISA, token),
      ]);

      const reasons = results.map((body) => errorOf(body)?.reason ?? 'saved');
      expect(reasons.sort()).toEqual(['DUPLICATE_CARD', 'saved']);
      expect(await storedRows()).toHaveLength(1);
    });
  });

  describe('CARD_LIMIT_REACHED (CARD-04 AC 10)', () => {
    it('rejects a 6th card and stores nothing', async () => {
      await testDbClient(Tables.BillingPaymentCard).insert([
        billingPaymentCardFactory.build({
          userId,
          isDefault: true,
          last4: '0001',
        }),
        ...billingPaymentCardFactory.buildList(4, { userId, last4: '0001' }),
      ]);

      const tokenize = jest.spyOn(gateway, 'tokenize');
      const detach = jest.spyOn(gateway, 'detach');

      const body = await addPaymentCard(VISA, tokenFor(userId));

      expect(errorOf(body)?.reason).toBe('CARD_LIMIT_REACHED');
      expect(body.data).toBeNull();
      const rows = await storedRows();
      expect(rows).toHaveLength(5);
      expect(rows.map((row) => row.last4)).not.toContain('4242');
      expect(detach).toHaveBeenCalledTimes(1);
      expect(detach).toHaveBeenCalledWith(await issuedToken(tokenize));
    });

    it('stores exactly 5 when two adds race at 4 cards (edge case)', async () => {
      await testDbClient(Tables.BillingPaymentCard).insert([
        billingPaymentCardFactory.build({
          userId,
          isDefault: true,
          last4: '0001',
        }),
        ...billingPaymentCardFactory.buildList(3, { userId, last4: '0001' }),
      ]);
      const token = tokenFor(userId);

      const results = await Promise.all([
        addPaymentCard(VISA, token),
        addPaymentCard(MASTERCARD, token),
      ]);

      const reasons = results.map((body) => errorOf(body)?.reason ?? 'saved');
      expect(reasons.sort()).toEqual(['CARD_LIMIT_REACHED', 'saved']);
      expect(await storedRows()).toHaveLength(5);
    });
  });

  it('rejects a card the gateway declines with CARD_DECLINED and stores nothing (CARD-05 AC 12)', async () => {
    const body = await addPaymentCard(DECLINED, tokenFor(userId));

    expect(errorOf(body)?.reason).toBe('CARD_DECLINED');
    expect(body.data).toBeNull();
    expect(await storedRows()).toHaveLength(0);
  });

  it('keeps every card number and CVV out of the error messages (CARD-06 AC 17)', async () => {
    await addPaymentCard(VISA, tokenFor(userId));

    const bodies = [
      await addPaymentCard(VISA, tokenFor(userId)),
      await addPaymentCard(DECLINED, tokenFor(userId)),
      await addPaymentCard({ ...VISA, cvv: '12' }, tokenFor(userId)),
    ];

    for (const body of bodies) {
      const raw = JSON.stringify(body.errors);
      expect(raw).not.toContain('4242');
      expect(raw).not.toContain('0002');
      expect(raw).not.toContain('"123"');
    }
  });

  it('responds UNAUTHENTICATED without a token and stores nothing (CARD-06 AC 18)', async () => {
    const body = await addPaymentCard(VISA);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toHaveLength(
      0,
    );
  });
});
