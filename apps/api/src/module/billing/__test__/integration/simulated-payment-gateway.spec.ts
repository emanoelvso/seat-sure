import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const VALID_CARD = {
  number: '4242 4242 4242 4242',
  holder: 'Jane Doe',
  expiry: '06/30',
  cvv: '123',
};

const DECLINED_CARD = {
  ...VALID_CARD,
  number: '4000 0000 0000 0002',
};

describe('SimulatedPaymentGateway (integration)', () => {
  let module: TestingModule;
  let gateway: PaymentGateway;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
    gateway = module.get<PaymentGateway>(PaymentGateway);
  });

  afterAll(async () => {
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('approves a non-test-declined number with a sim_-prefixed id (PAY-37)', async () => {
    const result = await gateway.charge({
      amountCents: 26000,
      currency: 'USD',
      card: VALID_CARD,
    });

    expect(result).toEqual({
      status: 'succeeded',
      providerPaymentId: expect.stringMatching(/^sim_/),
    });
  });

  it('returns different provider payment ids for two charges', async () => {
    const first = await gateway.charge({
      amountCents: 26000,
      currency: 'USD',
      card: VALID_CARD,
    });
    const second = await gateway.charge({
      amountCents: 26000,
      currency: 'USD',
      card: VALID_CARD,
    });

    expect(first.status).toBe('succeeded');
    expect(second.status).toBe('succeeded');
    expect((first as { providerPaymentId: string }).providerPaymentId).not.toBe(
      (second as { providerPaymentId: string }).providerPaymentId,
    );
  });

  it('declines 4000000000000002 with card_declined (PAY-40)', async () => {
    const result = await gateway.charge({
      amountCents: 26000,
      currency: 'USD',
      card: DECLINED_CARD,
    });

    expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
  });

  it('resolves refund', async () => {
    await expect(gateway.refund('sim_x')).resolves.toBeUndefined();
  });
});
