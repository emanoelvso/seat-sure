import { randomUUID } from 'crypto';
import { billingPaymentFactory } from '@billingModule/__test__/factory/billing-payment.factory';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';
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

    const outcome = await billingApi.charge({
      userId,
      orderId,
      amountCents: 26000,
      currency: 'USD',
      card: VALID_CARD,
    });

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

    const outcome = await billingApi.charge({
      userId,
      orderId,
      amountCents: 26000,
      currency: 'USD',
      card: DECLINED_CARD,
    });

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
        card: VALID_CARD,
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
        card: { number: '1', holder: '', expiry: 'bad', cvv: 'bad' },
      }),
    ).rejects.toThrow();

    expect(chargeSpy).not.toHaveBeenCalled();

    const rows = await testDbClient(Tables.BillingPayment).select();
    expect(rows).toHaveLength(0);

    chargeSpy.mockRestore();
  });

  it('refund sets status refunded and refundedAt (PAY-37)', async () => {
    const outcome = await billingApi.charge({
      userId: randomUUID(),
      orderId: randomUUID(),
      amountCents: 26000,
      currency: 'USD',
      card: VALID_CARD,
    });

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
      card,
    });

    const rows: Array<{ json: string }> = await testDbClient(
      Tables.BillingPayment,
    ).select(testDbClient.raw('row_to_json("BillingPayment")::text as json'));

    expect(rows.length).toBeGreaterThan(0);
    for (const { json } of rows) {
      expect(json).not.toContain('4242424242424242');
      expect(json).not.toContain(card.cvv);
    }
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
