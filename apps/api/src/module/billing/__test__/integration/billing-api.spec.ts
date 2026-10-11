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
      .spyOn(gateway, 'charge')
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
    const chargeSpy = jest.spyOn(gateway, 'charge');

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

  it('never stores the full card number or CVV in any row (PAY-47)', async () => {
    // A distinctive CVV: any match in the row's JSON can only come from the
    // column genuinely storing it, not from a coincidental digit run.
    const card = { ...VALID_CARD, cvv: '907' };
    await billingApi.charge({
      userId: randomUUID(),
      orderId: randomUUID(),
      amountCents: 26000,
      currency: 'USD',
      source: { type: 'card', card },
    });

    const rows: Array<Record<string, unknown>> = await testDbClient(
      Tables.BillingPayment,
    ).select('*');

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      for (const value of Object.values(row).map((v) => String(v))) {
        expect(value).not.toContain('4242424242424242');
        expect(value).not.toBe(card.cvv);
      }
    }
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
      const chargeSpy = jest.spyOn(gateway, 'charge');
      const savedCard = billingPaymentCardFactory.build({
        brand: 'mastercard',
        last4: '4444',
      });
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [savedCard]);

      const outcome = await chargeSaved(savedCard.userId, savedCard.id);

      expect(outcome.status).toBe('succeeded');
      expect(chargeSpy).toHaveBeenCalledWith({
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'token', token: savedCard.providerToken },
      });
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
        const chargeSpy = jest.spyOn(gateway, 'charge');
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
      const chargeSpy = jest.spyOn(gateway, 'charge');
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

  // CARDABUSE-01, CARDABUSE-02 (AD-028)
  describe('saved-card charge throttle', () => {
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
      const chargeSpy = jest.spyOn(module.get(PaymentGateway), 'charge');

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

    it('still processes a typed-card charge while locked (AC 3)', async () => {
      const userId = randomUUID();
      const declined = declinedCard(userId);
      await testDbClient.batchInsert(Tables.BillingPaymentCard, [declined]);
      await lockOut(userId, declined.id);

      const outcome = await billingApi.charge({
        userId,
        orderId: randomUUID(),
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: VALID_CARD },
      });

      expect(outcome.status).toBe('succeeded');
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
        .spyOn(module.get(PaymentGateway), 'charge')
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
