import { randomUUID } from 'crypto';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { billingPaymentFactory } from '@billingModule/__test__/factory/billing-payment.factory';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  BillingApi,
  ChargeOutcome,
} from '@sharedModules/integration/interface/billing-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const VALID_CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

const DECLINED_CARD = { ...VALID_CARD, number: '4000 0000 0000 0002' };

// Narrows an outcome that recorded a payment
const recorded = (outcome: ChargeOutcome) => {
  if (
    outcome.status === 'card_not_found' ||
    outcome.status === 'card_attempts_limited'
  ) {
    throw new Error('Expected a recorded payment');
  }
  return outcome;
};

const buildModule = async (): Promise<TestingModule> =>
  Test.createTestingModule({ imports: [BillingModule] }).compile();

const closeModule = async (module: TestingModule) => {
  const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};

describe('BillingPublicApiProvider (integration)', () => {
  let module: TestingModule;
  let billingApi: BillingApi;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await buildModule();
    billingApi = module.get<BillingApi>(BillingApi);
  });

  afterEach(async () => {
    await testDbClient(Tables.BillingPayment).del();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    await closeModule(module);
  });

  it('charges 26000 USD with a Visa card and records a succeeded payment (PAY-37)', async () => {
    const userId = randomUUID();
    const orderId = randomUUID();

    const outcome = recorded(
      await billingApi.charge({
        userId,
        orderId,
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: VALID_CARD },
      }),
    );

    expect(outcome.status).toBe('succeeded');
    expect(outcome.paymentId).toBeTruthy();

    const row = await testDbClient(Tables.BillingPayment)
      .where('id', outcome.paymentId)
      .first();
    expect(row).toMatchObject({
      userId,
      orderId,
      amountCents: 26000,
      currency: 'USD',
      cardBrand: 'visa',
      cardLast4: '4242',
      status: 'succeeded',
    });
    expect(row.providerPaymentId).toMatch(/^sim_/);
  });

  it('declines 4000000000000002 and records a failed payment with card_declined (PAY-40)', async () => {
    const userId = randomUUID();
    const orderId = randomUUID();

    const outcome = recorded(
      await billingApi.charge({
        userId,
        orderId,
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: DECLINED_CARD },
      }),
    );

    expect(outcome.status).toBe('failed');

    const row = await testDbClient(Tables.BillingPayment)
      .where('id', outcome.paymentId)
      .first();
    expect(row).toMatchObject({
      status: 'failed',
      failureReason: 'card_declined',
    });
  });

  it('rejects and leaves no row when the gateway throws', async () => {
    const gateway = module.get<PaymentGateway>(PaymentGateway);
    const chargeSpy = jest
      .spyOn(gateway, 'authorize')
      .mockRejectedValueOnce(new Error('gateway unavailable'));

    await expect(
      billingApi.charge({
        userId: randomUUID(),
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: VALID_CARD },
      }),
    ).rejects.toThrow('gateway unavailable');

    const rows = await testDbClient(Tables.BillingPayment).select();
    expect(rows).toHaveLength(0);

    chargeSpy.mockRestore();
  });

  it('rejects an invalid card without calling the gateway and without a row (PAY-44)', async () => {
    const gateway = module.get<PaymentGateway>(PaymentGateway);
    const chargeSpy = jest.spyOn(gateway, 'authorize');

    await expect(
      billingApi.charge({
        userId: randomUUID(),
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: {
          type: 'card',
          card: { number: '1', holder: '', expiry: 'bad', cvv: 'bad' },
        },
      }),
    ).rejects.toThrow();

    expect(chargeSpy).not.toHaveBeenCalled();

    const rows = await testDbClient(Tables.BillingPayment).select();
    expect(rows).toHaveLength(0);

    chargeSpy.mockRestore();
  });

  it('refund sets status refunded and refundedAt (PAY-37)', async () => {
    const outcome = recorded(
      await billingApi.charge({
        userId: randomUUID(),
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: VALID_CARD },
      }),
    );

    await billingApi.refund(outcome.paymentId);

    const row = await testDbClient(Tables.BillingPayment)
      .where('id', outcome.paymentId)
      .first();
    expect(row.status).toBe('refunded');
    expect(row.refundedAt).not.toBeNull();
  });

  // PAY-47, CARDABUSE-05. Deterministic by construction: the ids and the
  // gateway's token, fingerprint and payment id are fixed and contain no
  // digit, and only text columns are scanned (a uuid, timestamp or number
  // column cannot hold card text). So a match can only come from a column
  // that genuinely stores card data.
  describe('card data privacy (CARDABUSE-05)', () => {
    const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const TYPED_ORDER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const SAVED_ORDER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const TOKEN = 'sim_pm_opaque_token';
    const FINGERPRINT = 'abcdef'.repeat(10) + 'abcd';
    const PROVIDER_PAYMENT_ID = 'sim_payment_opaque';
    const CARD = { ...VALID_CARD, cvv: '907' };
    const TABLES = [
      Tables.BillingPayment,
      Tables.BillingPaymentCard,
      Tables.BillingCardThrottle,
    ];
    const TEXT_TYPES = ['character varying', 'character', 'text'];
    const UUID_PATTERN =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

    // Every stored text value of the user's rows, with where it lives
    const textValues = async () => {
      const columns: Array<{ table_name: string; column_name: string }> =
        await testDbClient('information_schema.columns')
          .select('table_name', 'column_name')
          .where('table_schema', 'public')
          .whereIn('table_name', TABLES)
          .whereIn('data_type', TEXT_TYPES);
      const found: Array<{ place: string; value: string }> = [];
      for (const table of TABLES) {
        const rows: Array<Record<string, unknown>> = await testDbClient(
          table,
        ).where({ userId: USER_ID });
        for (const row of rows) {
          for (const { column_name } of columns.filter(
            (column) => column.table_name === table,
          )) {
            const value = row[column_name];
            if (value !== null && value !== undefined) {
              found.push({
                place: `${table}.${column_name}`,
                value: String(value),
              });
            }
          }
        }
      }
      return found;
    };

    // Where a value may legitimately live: a saved card keeps its own token
    // and fingerprint (AD-026), nothing else is kept anywhere
    const ALLOWED_PLACES: Record<string, string> = {
      token: 'BillingPaymentCard.providerToken',
      fingerprint: 'BillingPaymentCard.fingerprint',
    };

    const leaks = async (needles: Record<string, string>) =>
      (await textValues()).flatMap(({ place, value }) =>
        Object.entries(needles)
          .filter(
            ([name, needle]) =>
              value.includes(needle) && ALLOWED_PLACES[name] !== place,
          )
          .map(([name]) => `${name} in ${place}`),
      );

    const NEEDLES = {
      number: '4242424242424242',
      spacedNumber: '4242 4242 4242 4242',
      cvv: CARD.cvv,
      token: TOKEN,
      fingerprint: FINGERPRINT,
    };

    beforeEach(() => {
      const gateway = module.get<PaymentGateway>(PaymentGateway);
      jest.spyOn(gateway, 'tokenize').mockResolvedValue({
        status: 'succeeded',
        token: TOKEN,
        fingerprint: FINGERPRINT,
      });
      jest.spyOn(gateway, 'authorize').mockResolvedValue({
        status: 'authorized',
        providerPaymentId: PROVIDER_PAYMENT_ID,
      });
      jest.spyOn(gateway, 'capture').mockResolvedValue(undefined);
    });

    afterEach(async () => {
      await testDbClient(Tables.BillingPaymentCard).del();
      await testDbClient(Tables.BillingCardThrottle).del();
      jest.restoreAllMocks();
    });

    const payTypedThenSaved = async () => {
      const cards = module.get(PaymentCardService);
      const typed = await billingApi.charge({
        userId: USER_ID,
        orderId: TYPED_ORDER_ID,
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: CARD },
      });
      const saved = await cards.add(USER_ID, CARD, new Date());
      const savedPayment = await billingApi.charge({
        userId: USER_ID,
        orderId: SAVED_ORDER_ID,
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'savedCard', savedCardId: saved[0].id },
      });
      return {
        typed,
        saved,
        savedPayment,
        listed: await cards.list(USER_ID, new Date()),
      };
    };

    it('finds no card number, CVV, token or fingerprint in any stored text value, for a typed and a saved-card payment (AC 1-3)', async () => {
      await payTypedThenSaved();

      const scanned = (await textValues()).map(({ place }) => place);
      expect(scanned).toEqual(
        expect.arrayContaining([
          'BillingPayment.cardLast4',
          'BillingPayment.providerPaymentId',
          'BillingPaymentCard.providerToken',
          'BillingPaymentCard.fingerprint',
          'BillingPaymentCard.holder',
        ]),
      );
      expect(await leaks(NEEDLES)).toEqual([]);
    });

    it('finds the CVV when a text column holds it inside a longer value (AC 4)', async () => {
      await payTypedThenSaved();
      await testDbClient(Tables.BillingPaymentCard)
        .where({ userId: USER_ID })
        .update({ holder: `cvv=${CARD.cvv}` });

      expect(await leaks(NEEDLES)).toEqual([
        'cvv in BillingPaymentCard.holder',
      ]);
    });

    it('returns no card number, CVV, token or fingerprint from add, list or charge (AC 5)', async () => {
      const results = await payTypedThenSaved();

      for (const [name, result] of Object.entries(results)) {
        // Random ids in the result are uuids; their hex digits can contain the fixture
        // CVV by chance, so they are removed before scanning. Card text cannot hide in
        // a uuid-shaped value.
        const json = JSON.stringify(result).replace(UUID_PATTERN, '');
        for (const [needleName, needle] of Object.entries(NEEDLES)) {
          expect({ name, needleName, found: json.includes(needle) }).toEqual({
            name,
            needleName,
            found: false,
          });
        }
      }
    });
  });

  describe('charge with a saved card (CARD-08)', () => {
    afterEach(async () => {
      await testDbClient(Tables.BillingPaymentCard).del();
      jest.restoreAllMocks();
    });

    const chargeSaved = (userId: string, savedCardId: string) =>
      billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'savedCard', savedCardId },
      });

    it("charges the saved card's token and records its brand and last 4 (AC 8, 11)", async () => {
      const gateway = module.get<PaymentGateway>(PaymentGateway);
      const chargeSpy = jest.spyOn(gateway, 'authorize');
      const savedCard = billingPaymentCardFactory.build({
        brand: 'mastercard',
        last4: '4444',
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);

      const outcome = await chargeSaved(savedCard.userId, savedCard.id);

      expect(outcome.status).toBe('succeeded');
      expect(chargeSpy).toHaveBeenCalledWith(
        {
          amountCents: 26000,
          currency: 'USD',
          source: { type: 'token', token: savedCard.providerToken },
        },
        expect.any(String),
      );
      const row = await testDbClient(Tables.BillingPayment)
        .where('id', recorded(outcome).paymentId)
        .first();
      expect(row).toMatchObject({
        userId: savedCard.userId,
        amountCents: 26000,
        status: 'succeeded',
        cardBrand: 'mastercard',
        cardLast4: '4444',
      });
      expect(row.providerPaymentId).toMatch(/^sim_/);
    });

    it.each([
      ["another user's card", (foreignCardId: string) => foreignCardId],
      ['an unknown card id', () => randomUUID()],
      ['a malformed card id', () => 'not-a-uuid'],
    ])(
      'returns card_not_found for %s, with no payment row and no gateway call (AC 9)',
      async (_, pickCardId) => {
        const gateway = module.get<PaymentGateway>(PaymentGateway);
        const chargeSpy = jest.spyOn(gateway, 'authorize');
        const foreignCard = billingPaymentCardFactory.build();
        await testDbClient.batchInsert(Tables.BillingPaymentCard, [
          foreignCard,
        ]);

        const outcome = await chargeSaved(
          randomUUID(),
          pickCardId(foreignCard.id),
        );

        expect(outcome).toEqual({ status: 'card_not_found' });
        expect(chargeSpy).not.toHaveBeenCalled();
        const rows = await testDbClient(Tables.BillingPayment).select();
        expect(rows).toHaveLength(0);
      },
    );

    it('records a failed card_expired payment for an expired card without calling the gateway', async () => {
      const gateway = module.get<PaymentGateway>(PaymentGateway);
      const chargeSpy = jest.spyOn(gateway, 'authorize');
      const savedCard = billingPaymentCardFactory.build({
        expMonth: 1,
        expYear: 2020,
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);

      const outcome = await chargeSaved(savedCard.userId, savedCard.id);

      expect(outcome.status).toBe('failed');
      expect(chargeSpy).not.toHaveBeenCalled();
      const row = await testDbClient(Tables.BillingPayment)
        .where('id', recorded(outcome).paymentId)
        .first();
      expect(row).toMatchObject({
        status: 'failed',
        failureReason: 'card_expired',
        cardBrand: 'visa',
        cardLast4: '4242',
      });
    });

    it('records a failed card_declined payment when the token is declined (AC 10)', async () => {
      const savedCard = billingPaymentCardFactory.build({
        providerToken: `sim_pm_decline_${randomUUID()}`,
        last4: '0341',
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);

      const outcome = await chargeSaved(savedCard.userId, savedCard.id);

      expect(outcome.status).toBe('failed');
      const row = await testDbClient(Tables.BillingPayment)
        .where('id', recorded(outcome).paymentId)
        .first();
      expect(row).toMatchObject({
        status: 'failed',
        failureReason: 'card_declined',
        cardLast4: '0341',
      });
    });
  });

  // CARDABUSE-01, CARDABUSE-02, TYPEDTHROTTLE-01 (AD-028)
  describe('card charge throttle', () => {
    afterEach(async () => {
      await testDbClient(Tables.BillingPaymentCard).del();
      await testDbClient(Tables.BillingCardThrottle).del();
      jest.restoreAllMocks();
    });

    const chargeSaved = (userId: string, savedCardId: string) =>
      billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'savedCard', savedCardId },
      });

    const chargeTyped = (userId: string, card: typeof VALID_CARD) =>
      billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card },
      });

    const declineTyped = async (userId: string, times: number) => {
      for (let i = 0; i < times; i += 1) {
        expect((await chargeTyped(userId, DECLINED_CARD)).status).toBe(
          'failed',
        );
      }
    };

    const declinedCard = (userId: string) =>
      billingPaymentCardFactory.build({
        userId,
        providerToken: `sim_pm_decline_${randomUUID()}`,
        last4: '0341',
      });

    const expiredCard = (userId: string) =>
      billingPaymentCardFactory.build({
        userId,
        expMonth: 1,
        expYear: 2020,
      });

    const okCard = (userId: string) =>
      billingPaymentCardFactory.build({ userId });

    const failedCount = async (userId: string) => {
      const row = await testDbClient(Tables.BillingCardThrottle)
        .where({ userId })
        .first();
      return row ? Number(row.failedCount) : 0;
    };

    const paymentRows = (userId: string) =>
      testDbClient(Tables.BillingPayment).where({ userId });

    const lockOut = async (userId: string, cardId: string) => {
      for (let i = 0; i < 5; i += 1) {
        expect((await chargeSaved(userId, cardId)).status).toBe('failed');
      }
    };

    it('returns card_attempts_limited after 5 declined charges, with no gateway call and no payment row (AC 2)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined]);
      await lockOut(userId, declined.id);
      const chargeSpy = jest.spyOn(module.get(PaymentGateway), 'authorize');

      const outcome = await chargeSaved(userId, declined.id);

      expect(outcome).toEqual({ status: 'card_attempts_limited' });
      expect(chargeSpy).not.toHaveBeenCalled();
      expect(await paymentRows(userId)).toHaveLength(5);
    });

    it('counts a declined and an expired saved-card charge, 1 each (AC 7)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      const expired = expiredCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [
        declined,
        expired,
      ]);

      await chargeSaved(userId, declined.id);
      expect(await failedCount(userId)).toBe(1);

      await chargeSaved(userId, expired.id);
      expect(await failedCount(userId)).toBe(2);
    });

    it('does not count card_not_found (AC 8)', async () => {
      const userId = randomUUID();

      for (let i = 0; i < 6; i += 1) {
        expect(await chargeSaved(userId, randomUUID())).toEqual({
          status: 'card_not_found',
        });
      }

      expect(await failedCount(userId)).toBe(0);
    });

    it('shares one counter with addPaymentCard: 3 failed charges and 2 declined adds lock both (AC 1, 2)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      const ok = okCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined, ok]);
      const cards = module.get(PaymentCardService);
      for (let i = 0; i < 3; i += 1) {
        await chargeSaved(userId, declined.id);
      }
      for (let i = 0; i < 2; i += 1) {
        await expect(
          cards.add(
            userId,
            { ...VALID_CARD, number: '4000 0000 0000 0002' },
            new Date(),
          ),
        ).rejects.toMatchObject({ reason: 'CARD_DECLINED' });
      }

      expect(await chargeSaved(userId, ok.id)).toEqual({
        status: 'card_attempts_limited',
      });
    });

    it('blocks the 6th declined typed charge with no gateway call and no payment row (TYPEDTHROTTLE-01 AC 1, 2)', async () => {
      const userId = randomUUID();
      await declineTyped(userId, 5);
      const chargeSpy = jest.spyOn(module.get(PaymentGateway), 'authorize');

      expect(await chargeTyped(userId, VALID_CARD)).toEqual({
        status: 'card_attempts_limited',
      });
      expect(chargeSpy).not.toHaveBeenCalled();
      expect(await paymentRows(userId)).toHaveLength(5);
    });

    it('counts each declined typed charge, 1 each (TYPEDTHROTTLE-01 AC 1)', async () => {
      const userId = randomUUID();

      await declineTyped(userId, 2);

      expect(await failedCount(userId)).toBe(2);
    });

    it('resets the count on a successful typed charge (TYPEDTHROTTLE-01 AC 4)', async () => {
      const userId = randomUUID();
      await declineTyped(userId, 4);
      expect(await failedCount(userId)).toBe(4);

      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('succeeded');
      expect(await failedCount(userId)).toBe(0);

      await declineTyped(userId, 4);
      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('succeeded');
    });

    it('checks the lock before the card rules (assumption: lock first)', async () => {
      const userId = randomUUID();
      await declineTyped(userId, 5);

      expect(await chargeTyped(userId, { ...VALID_CARD, cvv: '' })).toEqual({
        status: 'card_attempts_limited',
      });
    });

    it('charges a typed card again once the lock has ended (edge case)', async () => {
      const userId = randomUUID();
      await declineTyped(userId, 5);
      await testDbClient(Tables.BillingCardThrottle)
        .where({ userId })
        .update({ lockedUntil: new Date(Date.now() - 1000) });

      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('succeeded');
    });

    it('does not count a typed card rejected by the card rules (TYPEDTHROTTLE-01 AC 6)', async () => {
      const userId = randomUUID();

      for (let i = 0; i < 6; i += 1) {
        await expect(
          chargeTyped(userId, { ...VALID_CARD, cvv: '' }),
        ).rejects.toMatchObject({ reason: 'INVALID_CARD' });
      }

      expect(await failedCount(userId)).toBe(0);
    });

    it('does not count an unexpected gateway error on a typed card (TYPEDTHROTTLE-01 AC 7)', async () => {
      const userId = randomUUID();
      jest
        .spyOn(module.get(PaymentGateway), 'authorize')
        .mockRejectedValue(new Error('gateway down'));

      await expect(chargeTyped(userId, VALID_CARD)).rejects.toThrow(
        'gateway down',
      );

      expect(await failedCount(userId)).toBe(0);
    });

    it('blocks a typed-card charge once failed saved-card charges lock the user (TYPEDTHROTTLE-01 AC 5)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined]);
      await lockOut(userId, declined.id);
      const chargeSpy = jest.spyOn(module.get(PaymentGateway), 'authorize');

      expect(await chargeTyped(userId, VALID_CARD)).toEqual({
        status: 'card_attempts_limited',
      });
      expect(chargeSpy).not.toHaveBeenCalled();
    });

    it('resets the count on a successful saved-card charge (AC 5)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      const ok = okCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined, ok]);
      for (let i = 0; i < 4; i += 1) {
        await chargeSaved(userId, declined.id);
      }
      expect(await failedCount(userId)).toBe(4);

      expect((await chargeSaved(userId, ok.id)).status).toBe('succeeded');
      expect(await failedCount(userId)).toBe(0);

      for (let i = 0; i < 4; i += 1) {
        await chargeSaved(userId, declined.id);
      }
      expect((await chargeSaved(userId, ok.id)).status).toBe('succeeded');
    });

    it('charges again once the lock has ended (AC 4)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      const ok = okCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined, ok]);
      await lockOut(userId, declined.id);
      await testDbClient(Tables.BillingCardThrottle)
        .where({ userId })
        .update({ lockedUntil: new Date(Date.now() - 1000) });

      expect((await chargeSaved(userId, ok.id)).status).toBe('succeeded');
    });

    it("keeps each user's counter separate (AC 9)", async () => {
      const blocked = randomUUID();
      const declined = declinedCard(blocked);
      const other = okCard(randomUUID());
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [
        declined,
        other,
      ]);
      await lockOut(blocked, declined.id);

      expect((await chargeSaved(other.userId, other.id)).status).toBe(
        'succeeded',
      );
    });

    it('does not count an unexpected gateway error (edge case)', async () => {
      const userId = randomUUID();
      const ok = okCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [ok]);
      jest
        .spyOn(module.get(PaymentGateway), 'authorize')
        .mockRejectedValue(new Error('gateway down'));

      await expect(chargeSaved(userId, ok.id)).rejects.toThrow('gateway down');

      expect(await failedCount(userId)).toBe(0);
    });
  });

  // CARDABUSE-04
  describe('a removed saved card', () => {
    afterEach(async () => {
      await testDbClient(Tables.BillingPaymentCard).del();
    });

    it('leaves the payment it paid with unchanged, still showing its brand and last 4 (AC 1, 2)', async () => {
      const savedCard = billingPaymentCardFactory.build({
        brand: 'mastercard',
        last4: '4444',
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);
      const outcome = recorded(
        await billingApi.charge({
          userId: savedCard.userId,
          orderId: randomUUID(),
          amountCents: 26000,
          currency: 'USD',
          source: { type: 'savedCard', savedCardId: savedCard.id },
        }),
      );
      const before = await testDbClient(Tables.BillingPayment)
        .where('id', outcome.paymentId)
        .first();

      await module
        .get(PaymentCardService)
        .remove(savedCard.userId, savedCard.id, new Date());

      expect(
        await testDbClient(Tables.BillingPaymentCard).where('id', savedCard.id),
      ).toHaveLength(0);
      expect(await billingApi.findPaymentCard(outcome.paymentId)).toEqual({
        brand: 'mastercard',
        last4: '4444',
      });
      expect(
        await testDbClient(Tables.BillingPayment)
          .where('id', outcome.paymentId)
          .first(),
      ).toEqual(before);
    });
  });

  describe('findPaymentCard (ORDDETAIL-02)', () => {
    it('returns the brand and last 4 stored for the payment', async () => {
      const payment = billingPaymentFactory.build({
        cardBrand: 'mastercard',
        cardLast4: '4444',
      });
      await testDbClient.batchInsert(Tables.BillingPayment, [payment]);

      const card = await billingApi.findPaymentCard(payment.id);

      expect(card).toEqual({ brand: 'mastercard', last4: '4444' });
    });

    it('returns null for an unknown payment id', async () => {
      await testDbClient.batchInsert(Tables.BillingPayment, [
        billingPaymentFactory.build(),
      ]);

      await expect(
        billingApi.findPaymentCard(randomUUID()),
      ).resolves.toBeNull();
    });

    it('returns null for a payment id that is not a UUID', async () => {
      await expect(
        billingApi.findPaymentCard('not-a-uuid'),
      ).resolves.toBeNull();
    });
  });
});
