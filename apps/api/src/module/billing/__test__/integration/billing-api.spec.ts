import { randomUUID } from 'crypto';
import { billingPaymentCardFactory } from '@billingModule/__test__/factory/billing-payment-card.factory';
import { billingPaymentFactory } from '@billingModule/__test__/factory/billing-payment.factory';
import { PendingCardService } from '@billingModule/core/service/pending-card.service';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
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
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
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
const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO_TIMESTAMP_PATTERN =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;

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

  it('charges 26000 USD with a Visa card and records an authorized payment (PAY-37)', async () => {
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

    expect(outcome.status).toBe('authorized');
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
      status: 'authorized',
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
      .mockRejectedValue(new Error('gateway unavailable'));

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

  it('refunds at the gateway with the payment refund idempotency key (GW-02)', async () => {
    const outcome = recorded(
      await billingApi.charge({
        userId: randomUUID(),
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: VALID_CARD },
      }),
    );
    const gateway = module.get<PaymentGateway>(PaymentGateway);
    const refundSpy = jest.spyOn(gateway, 'refund');

    await billingApi.refund(outcome.paymentId);

    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledWith(
      expect.any(String),
      `${outcome.paymentId}:refund`,
    );

    refundSpy.mockRestore();
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

      expect(outcome.status).toBe('authorized');
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
        status: 'authorized',
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

      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('authorized');
      expect(await failedCount(userId)).toBe(0);

      await declineTyped(userId, 4);
      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('authorized');
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

      expect((await chargeTyped(userId, VALID_CARD)).status).toBe('authorized');
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

      expect((await chargeSaved(userId, ok.id)).status).toBe('authorized');
      expect(await failedCount(userId)).toBe(0);

      for (let i = 0; i < 4; i += 1) {
        await chargeSaved(userId, declined.id);
      }
      expect((await chargeSaved(userId, ok.id)).status).toBe('authorized');
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

      expect((await chargeSaved(userId, ok.id)).status).toBe('authorized');
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
        'authorized',
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

  describe('authorize with idempotency keys (GW-02, GW-17, GW-49, GW-50)', () => {
    const CHALLENGE_CARD = { ...VALID_CARD, number: '4000 0027 6000 3184' };
    const CVV = '907';

    const charge = (
      userId: string,
      card: typeof VALID_CARD,
      saveCard?: boolean,
    ) =>
      billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: { ...card, cvv: CVV } },
        saveCard,
      });

    const throttleRow = (userId: string) =>
      testDbClient(Tables.BillingCardThrottle).where({ userId }).first();

    afterEach(async () => {
      jest.restoreAllMocks();
      await testDbClient(Tables.BillingCardThrottle).del();
      await testDbClient(Tables.BillingPendingCard).del();
      await testDbClient(Tables.BillingSimulatedPayment).del();
    });

    it('authorizes with the key <paymentId>:authorize (GW-02)', async () => {
      const authorize = jest.spyOn(
        module.get<PaymentGateway>(PaymentGateway),
        'authorize',
      );

      const outcome = recorded(await charge(randomUUID(), VALID_CARD));

      expect(authorize).toHaveBeenCalledTimes(1);
      expect(authorize).toHaveBeenCalledWith(
        expect.anything(),
        `${outcome.paymentId}:authorize`,
      );
    });

    it('retries once with the same key when the gateway throws, and records the second answer (GW-49)', async () => {
      const gateway = module.get<PaymentGateway>(PaymentGateway);
      const real = gateway.authorize.bind(gateway);
      const authorize = jest
        .spyOn(gateway, 'authorize')
        .mockRejectedValueOnce(new Error('connection reset'))
        .mockImplementation(real);

      const outcome = recorded(await charge(randomUUID(), VALID_CARD));

      expect(outcome.status).toBe('authorized');
      expect(authorize).toHaveBeenCalledTimes(2);
      expect(authorize.mock.calls[1][1]).toBe(authorize.mock.calls[0][1]);
    });

    it('throws after the second failure, with the same key twice and no row (GW-49)', async () => {
      const authorize = jest
        .spyOn(module.get<PaymentGateway>(PaymentGateway), 'authorize')
        .mockRejectedValue(new Error('connection reset'));

      await expect(charge(randomUUID(), VALID_CARD)).rejects.toThrow(
        'connection reset',
      );

      expect(authorize).toHaveBeenCalledTimes(2);
      expect(authorize.mock.calls[1][1]).toBe(authorize.mock.calls[0][1]);
      expect(await testDbClient(Tables.BillingPayment).select()).toEqual([]);
    });

    it('records an authorized payment for 4242 and clears the throttle (GW-17)', async () => {
      const userId = randomUUID();
      await charge(userId, DECLINED_CARD);
      expect(Number((await throttleRow(userId)).failedCount)).toBe(1);

      const outcome = recorded(await charge(userId, VALID_CARD));

      expect(
        await testDbClient(Tables.BillingPayment)
          .where('id', outcome.paymentId)
          .first(),
      ).toMatchObject({ status: 'authorized', provider: 'simulated' });
      expect(await throttleRow(userId)).toBeUndefined();
    });

    it('records a requires_action payment for 3184 and returns the action (GW-19)', async () => {
      const outcome = await charge(randomUUID(), CHALLENGE_CARD);

      expect(outcome).toEqual({
        status: 'requires_action',
        paymentId: expect.any(String),
        action: {
          provider: 'simulated',
          clientSecret: expect.stringMatching(/^sim_secret_/),
        },
      });
      const row = await testDbClient(Tables.BillingPayment)
        .where('id', recorded(outcome).paymentId)
        .first();
      expect(row).toMatchObject({
        status: 'requires_action',
        cardLast4: '3184',
        providerPaymentId: expect.stringMatching(/^sim_/),
        failureReason: null,
      });
    });

    it('leaves the throttle unchanged on requires_action (GW-17)', async () => {
      const userId = randomUUID();
      await charge(userId, DECLINED_CARD);

      await charge(userId, CHALLENGE_CARD);

      expect(Number((await throttleRow(userId)).failedCount)).toBe(1);
    });

    it('records a failed payment for 0002 and counts one failure (GW-17)', async () => {
      const userId = randomUUID();

      const outcome = recorded(await charge(userId, DECLINED_CARD));

      expect(outcome.status).toBe('failed');
      expect(
        await testDbClient(Tables.BillingPayment)
          .where('id', outcome.paymentId)
          .first(),
      ).toMatchObject({ status: 'failed', failureReason: 'card_declined' });
      expect(Number((await throttleRow(userId)).failedCount)).toBe(1);
    });

    it('holds a pending card for the payment when saveCard is set, without saving it (GW-50)', async () => {
      const userId = randomUUID();

      const outcome = recorded(await charge(userId, VALID_CARD, true));

      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual([
        expect.objectContaining({
          paymentId: outcome.paymentId,
          userId,
          brand: 'visa',
          last4: '4242',
          holder: 'Jane Doe',
        }),
      ]);
      expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual(
        [],
      );
    });

    it('authorizes by the token of the card to save', async () => {
      const authorize = jest.spyOn(
        module.get<PaymentGateway>(PaymentGateway),
        'authorize',
      );

      await charge(randomUUID(), VALID_CARD, true);

      expect(authorize.mock.calls[0][0].source).toEqual({
        type: 'token',
        token: expect.stringMatching(/^sim_pm_/),
      });
    });

    it('holds no card when saveCard is not set', async () => {
      await charge(randomUUID(), VALID_CARD);

      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
        [],
      );
    });

    it('records a failed payment when the card to save is declined at tokenize, and holds nothing', async () => {
      const userId = randomUUID();
      const authorize = jest.spyOn(
        module.get<PaymentGateway>(PaymentGateway),
        'authorize',
      );

      const outcome = recorded(await charge(userId, DECLINED_CARD, true));

      expect(outcome.status).toBe('failed');
      expect(authorize).not.toHaveBeenCalled();
      expect(Number((await throttleRow(userId)).failedCount)).toBe(1);
      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
        [],
      );
    });

    it('drops the held card when the authorization is declined', async () => {
      const detach = jest.spyOn(
        module.get<PaymentGateway>(PaymentGateway),
        'detach',
      );

      const outcome = recorded(
        await charge(
          randomUUID(),
          { ...VALID_CARD, number: '4000 0000 0000 0341' },
          true,
        ),
      );

      expect(outcome.status).toBe('failed');
      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
        [],
      );
      expect(detach).toHaveBeenCalledTimes(1);
    });

    it('drops the held card when the gateway throws twice', async () => {
      jest
        .spyOn(module.get<PaymentGateway>(PaymentGateway), 'authorize')
        .mockRejectedValue(new Error('connection reset'));

      await expect(charge(randomUUID(), VALID_CARD, true)).rejects.toThrow();

      expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
        [],
      );
    });

    it('stores and logs no card number, CVV, token or client secret (GW-07)', async () => {
      const userId = randomUUID();
      const logged: unknown[] = [];
      for (const method of ['log', 'error', 'warn'] as const) {
        jest
          .spyOn(AppLogger.prototype, method)
          .mockImplementation((...args: unknown[]) => {
            logged.push(args);
          });
      }

      const challenge = await charge(userId, CHALLENGE_CARD);
      await charge(userId, VALID_CARD, true);
      await charge(userId, DECLINED_CARD);
      const clientSecret =
        recorded(challenge).status === 'requires_action'
          ? (challenge as { action: { clientSecret: string } }).action
              .clientSecret
          : '';
      expect(clientSecret).not.toBe('');
      // Short fixed secrets are scanned in text only: a uuid, timestamp or
      // number cannot hold card text, but its digits can contain the CVV by
      // chance. The client secret embeds a uuid itself, so it is matched
      // whole against the raw output.
      const secrets = [
        CVV,
        '4242424242424242',
        '4000002760003184',
        '4000000000000002',
        'sim_pm_',
      ];

      const rows = await testDbClient(Tables.BillingPayment).where({ userId });
      const columns: Array<{ column_name: string }> = await testDbClient(
        'information_schema.columns',
      )
        .select('column_name')
        .where({ table_schema: 'public', table_name: Tables.BillingPayment })
        .whereIn('data_type', ['character varying', 'character', 'text']);
      const storedText = rows
        .flatMap((row: Record<string, unknown>) =>
          columns.map(({ column_name }) => row[column_name]),
        )
        .filter((value) => value !== null && value !== undefined)
        .map(String)
        .join('\n');
      const loggedText = JSON.stringify(logged)
        .replace(UUID_PATTERN, '')
        .replace(ISO_TIMESTAMP_PATTERN, '');
      for (const secret of secrets) {
        expect(storedText).not.toContain(secret);
        expect(loggedText).not.toContain(secret);
      }
      expect(JSON.stringify(rows)).not.toContain(clientSecret);
      expect(JSON.stringify(logged)).not.toContain(clientSecret);
    });
  });

  describe('settle, capture and cancel (GW-04, GW-06, GW-10, GW-17)', () => {
    const CHALLENGE_CARD = { ...VALID_CARD, number: '4000 0027 6000 3184' };

    const gatewayOf = () => module.get<PaymentGateway>(PaymentGateway);
    const bank = () => module.get(SimulatedPaymentGateway);

    const charge = (
      userId: string,
      card: typeof VALID_CARD,
      saveCard = false,
    ) =>
      billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card },
        saveCard,
      });

    // A payment waiting for its 3-D Secure challenge
    const challenged = async (userId: string, saveCard = false) => {
      const outcome = await charge(userId, CHALLENGE_CARD, saveCard);
      if (outcome.status !== 'requires_action') {
        throw new Error('expected a challenge');
      }
      return outcome;
    };

    const paymentRow = (paymentId: string) =>
      testDbClient(Tables.BillingPayment).where('id', paymentId).first();
    const throttleRow = (userId: string) =>
      testDbClient(Tables.BillingCardThrottle).where({ userId }).first();

    afterEach(async () => {
      jest.restoreAllMocks();
      await testDbClient(Tables.BillingCardThrottle).del();
      await testDbClient(Tables.BillingPendingCard).del();
      await testDbClient(Tables.BillingPaymentCard).del();
      await testDbClient(Tables.BillingSimulatedPayment).del();
    });

    describe('capture', () => {
      it('marks the payment succeeded and captures it at the gateway with the key <paymentId>:capture (GW-04)', async () => {
        const authorized = recorded(await charge(randomUUID(), VALID_CARD));
        const capture = jest.spyOn(gatewayOf(), 'capture');

        await billingApi.capture(authorized.paymentId);

        expect(capture).toHaveBeenCalledTimes(1);
        expect(capture).toHaveBeenCalledWith(
          expect.stringMatching(/^sim_/),
          `${authorized.paymentId}:capture`,
        );
        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'succeeded',
        });
      });

      it('promotes the card held for the payment (GW-50)', async () => {
        const userId = randomUUID();
        const authorized = recorded(await charge(userId, VALID_CARD, true));
        expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual(
          [],
        );

        await billingApi.capture(authorized.paymentId);

        expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual([
          expect.objectContaining({ userId, last4: '4242', isDefault: true }),
        ]);
        expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
          [],
        );
      });

      it('completes the capture of a payment whose held card is refused while the detach throws (CLN-02)', async () => {
        const userId = randomUUID();
        const authorized = recorded(await charge(userId, VALID_CARD, true));
        const [held] = await testDbClient(Tables.BillingPendingCard).select();
        await testDbClient(Tables.BillingPaymentCard).insert(
          billingPaymentCardFactory.build({
            userId,
            provider: held.provider,
            fingerprint: held.fingerprint,
          }),
        );
        jest
          .spyOn(gatewayOf(), 'detach')
          .mockRejectedValue(new Error('gateway down'));
        jest
          .spyOn(AppLogger.prototype, 'error')
          .mockImplementation(() => undefined);

        await expect(
          billingApi.capture(authorized.paymentId),
        ).resolves.toBeUndefined();

        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'succeeded',
        });
        expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
          [],
        );
        expect(await testDbClient(Tables.BillingPaymentCard)).toHaveLength(1);
      });

      it('retries a failing capture with the same key: two throws then a success is 3 calls', async () => {
        const authorized = recorded(await charge(randomUUID(), VALID_CARD));
        const gateway = gatewayOf();
        const real = gateway.capture.bind(gateway);
        const capture = jest
          .spyOn(gateway, 'capture')
          .mockRejectedValueOnce(new Error('timeout'))
          .mockRejectedValueOnce(new Error('timeout'))
          .mockImplementation(real);

        await billingApi.capture(authorized.paymentId);

        expect(capture).toHaveBeenCalledTimes(3);
        expect(new Set(capture.mock.calls.map(([, key]) => key))).toEqual(
          new Set([`${authorized.paymentId}:capture`]),
        );
        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'succeeded',
        });
      });

      it('throws after 3 failed attempts and leaves the payment authorized', async () => {
        const authorized = recorded(
          await charge(randomUUID(), VALID_CARD, true),
        );
        const capture = jest
          .spyOn(gatewayOf(), 'capture')
          .mockRejectedValue(new Error('timeout'));

        await expect(billingApi.capture(authorized.paymentId)).rejects.toThrow(
          'timeout',
        );

        expect(capture).toHaveBeenCalledTimes(3);
        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'authorized',
        });
        expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual(
          [],
        );
      });

      it('keeps a captured payment succeeded when its card cannot be saved, and logs the order and payment ids only', async () => {
        const authorized = recorded(
          await charge(randomUUID(), VALID_CARD, true),
        );
        jest
          .spyOn(PendingCardService.prototype, 'promote')
          .mockRejectedValue(new Error('database unavailable'));
        const error = jest
          .spyOn(AppLogger.prototype, 'error')
          .mockImplementation(() => undefined);

        await expect(
          billingApi.capture(authorized.paymentId),
        ).resolves.toBeUndefined();

        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'succeeded',
        });
        expect(error).toHaveBeenCalledWith(expect.any(String), {
          orderId: (await paymentRow(authorized.paymentId)).orderId,
          paymentId: authorized.paymentId,
        });
      });

      it('does nothing for a payment that is not authorized or is unknown', async () => {
        const declined = recorded(await charge(randomUUID(), DECLINED_CARD));
        const capture = jest.spyOn(gatewayOf(), 'capture');

        await billingApi.capture(declined.paymentId);
        await billingApi.capture(randomUUID());

        expect(capture).not.toHaveBeenCalled();
        expect(await paymentRow(declined.paymentId)).toMatchObject({
          status: 'failed',
        });
      });

      it('does not capture twice', async () => {
        const authorized = recorded(await charge(randomUUID(), VALID_CARD));
        await billingApi.capture(authorized.paymentId);
        const capture = jest.spyOn(gatewayOf(), 'capture');

        await billingApi.capture(authorized.paymentId);

        expect(capture).not.toHaveBeenCalled();
      });
    });

    describe('settle', () => {
      it('records an approved challenge as authorized and clears the throttle (GW-17)', async () => {
        const userId = randomUUID();
        await charge(userId, DECLINED_CARD);
        const outcome = await challenged(userId);
        await bank().approve(outcome.action.clientSecret);

        const settled = await billingApi.settle(outcome.paymentId);

        expect(settled).toEqual({ status: 'authorized' });
        expect(await paymentRow(outcome.paymentId)).toMatchObject({
          status: 'authorized',
          failureReason: null,
        });
        expect(await throttleRow(userId)).toBeUndefined();
      });

      it('records a failed challenge as failed with authentication_failed, counts one failure and drops the held card (GW-10, GW-17)', async () => {
        const userId = randomUUID();
        const outcome = await challenged(userId, true);
        expect(
          await testDbClient(Tables.BillingPendingCard).select(),
        ).toHaveLength(1);
        await bank().fail(outcome.action.clientSecret);

        const settled = await billingApi.settle(outcome.paymentId);

        expect(settled).toEqual({ status: 'failed' });
        expect(await paymentRow(outcome.paymentId)).toMatchObject({
          status: 'failed',
          failureReason: 'authentication_failed',
        });
        expect(Number((await throttleRow(userId)).failedCount)).toBe(1);
        expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
          [],
        );
      });

      it('reports a challenge still pending with its action and changes nothing (GW-11)', async () => {
        const userId = randomUUID();
        const outcome = await challenged(userId, true);

        const settled = await billingApi.settle(outcome.paymentId);

        expect(settled).toEqual({
          status: 'requires_action',
          action: outcome.action,
        });
        expect(await paymentRow(outcome.paymentId)).toMatchObject({
          status: 'requires_action',
        });
        expect(await throttleRow(userId)).toBeUndefined();
        expect(
          await testDbClient(Tables.BillingPendingCard).select(),
        ).toHaveLength(1);
      });

      it('answers an already authorized payment without asking the gateway', async () => {
        const authorized = recorded(await charge(randomUUID(), VALID_CARD));
        const getPayment = jest.spyOn(gatewayOf(), 'getPayment');

        expect(await billingApi.settle(authorized.paymentId)).toEqual({
          status: 'authorized',
        });
        expect(getPayment).not.toHaveBeenCalled();
      });

      it('throws for an unknown payment', async () => {
        await expect(billingApi.settle(randomUUID())).rejects.toThrow();
      });
    });

    describe('cancel', () => {
      it('cancels an authorized payment at the gateway with the key <paymentId>:cancel and drops the held card', async () => {
        const authorized = recorded(
          await charge(randomUUID(), VALID_CARD, true),
        );
        const cancel = jest.spyOn(gatewayOf(), 'cancel');

        await billingApi.cancel(authorized.paymentId);

        expect(cancel).toHaveBeenCalledWith(
          expect.stringMatching(/^sim_/),
          `${authorized.paymentId}:cancel`,
        );
        expect(await paymentRow(authorized.paymentId)).toMatchObject({
          status: 'cancelled',
        });
        expect(await testDbClient(Tables.BillingPendingCard).select()).toEqual(
          [],
        );
        expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual(
          [],
        );
      });

      it('cancels a payment that still awaits its challenge', async () => {
        const outcome = await challenged(randomUUID());

        await billingApi.cancel(outcome.paymentId);

        expect(await paymentRow(outcome.paymentId)).toMatchObject({
          status: 'cancelled',
        });
        expect(
          await billingApi.findPaymentAction(outcome.paymentId),
        ).toBeNull();
      });

      it('does nothing for a captured, failed or unknown payment', async () => {
        const captured = recorded(await charge(randomUUID(), VALID_CARD));
        await billingApi.capture(captured.paymentId);
        const declined = recorded(await charge(randomUUID(), DECLINED_CARD));
        const cancel = jest.spyOn(gatewayOf(), 'cancel');

        await billingApi.cancel(captured.paymentId);
        await billingApi.cancel(declined.paymentId);
        await billingApi.cancel(randomUUID());

        expect(cancel).not.toHaveBeenCalled();
        expect(await paymentRow(captured.paymentId)).toMatchObject({
          status: 'succeeded',
        });
      });
    });

    describe('findPaymentAction', () => {
      it('returns the action while the payment awaits its challenge', async () => {
        const outcome = await challenged(randomUUID());

        expect(await billingApi.findPaymentAction(outcome.paymentId)).toEqual(
          outcome.action,
        );
      });

      it('returns null once the challenge is settled', async () => {
        const approved = await challenged(randomUUID());
        await bank().approve(approved.action.clientSecret);
        await billingApi.settle(approved.paymentId);
        const failed = await challenged(randomUUID());
        await bank().fail(failed.action.clientSecret);
        await billingApi.settle(failed.paymentId);

        expect(
          await billingApi.findPaymentAction(approved.paymentId),
        ).toBeNull();
        expect(await billingApi.findPaymentAction(failed.paymentId)).toBeNull();
      });

      it('returns null when the bank answered but the payment is not settled yet', async () => {
        const outcome = await challenged(randomUUID());
        await bank().approve(outcome.action.clientSecret);

        expect(
          await billingApi.findPaymentAction(outcome.paymentId),
        ).toBeNull();
      });

      it('returns null for an authorized, unknown or malformed payment id', async () => {
        const authorized = recorded(await charge(randomUUID(), VALID_CARD));

        expect(
          await billingApi.findPaymentAction(authorized.paymentId),
        ).toBeNull();
        expect(await billingApi.findPaymentAction(randomUUID())).toBeNull();
        expect(await billingApi.findPaymentAction('not-a-uuid')).toBeNull();
      });
    });
  });

  describe('reconcileGatewayTokens (REC-04, REC-05)', () => {
    it('returns the zero summary through BillingApi with the simulated gateway', async () => {
      await expect(
        billingApi.reconcileGatewayTokens(new Date()),
      ).resolves.toEqual({
        customersScanned: 0,
        methodsScanned: 0,
        orphansDetached: 0,
        recentSkipped: 0,
        missingCustomers: 0,
        failures: 0,
      });
    });
  });
});
