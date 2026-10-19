import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const SUCCESS = {
  number: '4242 4242 4242 4242',
  holder: 'Demo Visitor',
  expiry: '12/39',
  cvv: '123',
};
const DECLINE = { ...SUCCESS, number: '4000 0000 0000 0002' };
const OTHER = { ...SUCCESS, number: '5555 5555 5555 4444' };
const MESSAGE = 'Use a documented simulator test card.';

describe('Demo card restrictions (REL-22)', () => {
  let module: TestingModule;
  let api: BillingApi;
  let cards: PaymentCardService;
  let gateway: PaymentGateway;
  let config: ConfigService;
  const userId = randomUUID();
  const charge = (card: typeof SUCCESS) =>
    api.charge({
      userId,
      orderId: randomUUID(),
      amountCents: 26000,
      currency: 'USD',
      source: { type: 'card', card },
    });
  const clean = async () => {
    for (const table of [
      Tables.BillingPayment,
      Tables.BillingPaymentCard,
      Tables.BillingCardThrottle,
    ])
      await testDbClient(table).del();
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    const base = factory();
    config = new ConfigService({
      ...base,
      demo: { ...base.demo, enabled: true },
    });
    module = await Test.createTestingModule({ imports: [BillingModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    api = module.get<BillingApi>(BillingApi);
    cards = module.get(PaymentCardService);
    gateway = module.get<PaymentGateway>(PaymentGateway);
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    config.set('demo', { ...config.get('demo'), enabled: true });
    await clean();
  });
  afterAll(async () => {
    await clean();
    const datasource = module.get<DataSource>(getDataSourceToken('billing'));
    if (datasource.isInitialized) await datasource.destroy();
    await testDbClient.destroy();
  });

  it('rejects non-test cards before direct charge and stores no payment', async () => {
    const spy = jest.spyOn(gateway, 'authorize');
    await expect(charge(OTHER)).rejects.toMatchObject({
      reason: 'INVALID_CARD',
      fields: { number: MESSAGE },
    });
    expect(spy).not.toHaveBeenCalled();
    expect(await testDbClient(Tables.BillingPayment).select()).toEqual([]);
  });

  it('returns the same exact card-field error to checkout validation', async () => {
    expect(await api.validateCard(OTHER, new Date())).toMatchObject({
      number: MESSAGE,
    });
    expect(await api.validateCard(SUCCESS, new Date())).toEqual({
      number: '',
      holder: '',
      expiry: '',
      cvv: '',
    });
  });

  it('rejects non-test saved-card entry before tokenization and stores no card', async () => {
    const spy = jest.spyOn(gateway, 'tokenize');
    await expect(cards.add(userId, OTHER, new Date())).rejects.toMatchObject({
      reason: 'INVALID_CARD',
      fields: { number: MESSAGE },
    });
    expect(spy).not.toHaveBeenCalled();
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual([]);
  });

  it('accepts the documented 3-D Secure card 4000002760003184 (GW-23)', async () => {
    const challenge = { ...SUCCESS, number: '4000 0027 6000 3184' };

    expect(await api.validateCard(challenge, new Date())).toEqual({
      number: '',
      holder: '',
      expiry: '',
      cvv: '',
    });
  });

  it('charges the documented success card and records its exact safe summary', async () => {
    const outcome = await charge(SUCCESS);
    expect(outcome.status).toBe('succeeded');
    expect(await testDbClient(Tables.BillingPayment).first()).toMatchObject({
      userId,
      amountCents: 26000,
      currency: 'USD',
      cardLast4: '4242',
      status: 'succeeded',
    });
  });

  it('allows the documented decline card to reach the simulator and records a decline', async () => {
    const outcome = await charge(DECLINE);
    expect(outcome.status).toBe('failed');
    expect(await testDbClient(Tables.BillingPayment).first()).toMatchObject({
      cardLast4: '0002',
      status: 'failed',
      failureReason: 'card_declined',
    });
  });

  it('saves the success card and can charge its owned token', async () => {
    const saved = await cards.add(userId, SUCCESS, new Date());
    expect(saved).toEqual([
      expect.objectContaining({ last4: '4242', isDefault: true }),
    ]);
    const outcome = await api.charge({
      userId,
      orderId: randomUUID(),
      amountCents: 100,
      currency: 'USD',
      source: { type: 'savedCard', savedCardId: saved[0].id },
    });
    expect(outcome.status).toBe('succeeded');
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toHaveLength(
      1,
    );
    expect(await testDbClient(Tables.BillingPayment).first()).toMatchObject({
      userId,
      status: 'succeeded',
      cardLast4: '4242',
    });
  });

  it('allows the documented decline fixture on saved-card entry without storing it', async () => {
    await expect(cards.add(userId, DECLINE, new Date())).rejects.toMatchObject({
      reason: 'CARD_DECLINED',
    });
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual([]);
  });

  it('supports the attach-success token-charge-decline simulator fixture', async () => {
    const saved = await cards.add(
      userId,
      { ...SUCCESS, number: '4000 0000 0000 0341' },
      new Date(),
    );
    expect(saved[0].last4).toBe('0341');
    const outcome = await api.charge({
      userId,
      orderId: randomUUID(),
      amountCents: 100,
      currency: 'USD',
      source: { type: 'savedCard', savedCardId: saved[0].id },
    });
    expect(outcome.status).toBe('failed');
    expect(await testDbClient(Tables.BillingPayment).first()).toMatchObject({
      status: 'failed',
      failureReason: 'card_declined',
      cardLast4: '0341',
    });
  });

  it('preserves ordinary Mastercard behavior outside demo mode on both paths', async () => {
    config.set('demo', { ...config.get('demo'), enabled: false });
    expect((await charge(OTHER)).status).toBe('succeeded');
    expect((await cards.add(userId, OTHER, new Date()))[0].last4).toBe('4444');
    expect(await testDbClient(Tables.BillingPayment).first()).toMatchObject({
      status: 'succeeded',
      cardLast4: '4444',
    });
    expect(await testDbClient(Tables.BillingPaymentCard).first()).toMatchObject(
      { userId, last4: '4444' },
    );
  });
});
