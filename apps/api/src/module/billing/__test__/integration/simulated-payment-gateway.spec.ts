import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
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

const TOKEN_DECLINED_CARD = {
  ...VALID_CARD,
  number: '4000 0000 0000 0341',
};

const SIM_TOKEN = /^sim_pm_[0-9a-f-]{36}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

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
      source: { type: 'card', card: VALID_CARD },
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
      source: { type: 'card', card: VALID_CARD },
    });
    const second = await gateway.charge({
      amountCents: 26000,
      currency: 'USD',
      source: { type: 'card', card: VALID_CARD },
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
      source: { type: 'card', card: DECLINED_CARD },
    });

    expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
  });

  it('resolves refund', async () => {
    await expect(gateway.refund('sim_x')).resolves.toBeUndefined();
  });

  describe('tokenize', () => {
    it('tokenizes 4242 4242 4242 4242 to a sim_pm_ token and a 64-hex fingerprint (CARD-03)', async () => {
      const result = await gateway.tokenize(VALID_CARD);

      expect(result).toEqual({
        status: 'succeeded',
        token: expect.stringMatching(SIM_TOKEN),
        fingerprint: expect.stringMatching(HEX_64),
      });
    });

    it('gives a different token and the same fingerprint for the same number (CARD-04 duplicate check)', async () => {
      const first = await gateway.tokenize(VALID_CARD);
      const second = await gateway.tokenize({
        ...VALID_CARD,
        number: '4242424242424242',
        holder: 'Someone Else',
      });

      if (first.status !== 'succeeded' || second.status !== 'succeeded') {
        throw new Error('expected both tokenizations to succeed');
      }
      expect(first.token).not.toBe(second.token);
      expect(first.fingerprint).toBe(second.fingerprint);
    });

    it('gives a different fingerprint for a different number', async () => {
      const visa = await gateway.tokenize(VALID_CARD);
      const mastercard = await gateway.tokenize({
        ...VALID_CARD,
        number: '5555 5555 5555 4444',
      });

      if (visa.status !== 'succeeded' || mastercard.status !== 'succeeded') {
        throw new Error('expected both tokenizations to succeed');
      }
      expect(visa.fingerprint).not.toBe(mastercard.fingerprint);
    });

    it('keys the fingerprint with billing.fingerprintSecret and never embeds the digits (CARD-06)', async () => {
      const original = process.env.BILLING_FINGERPRINT_SECRET;
      process.env.BILLING_FINGERPRINT_SECRET =
        'another-fingerprint-secret-0123456789abcdef';
      const otherGateway = new SimulatedPaymentGateway(
        new ConfigService(factory()),
      );
      process.env.BILLING_FINGERPRINT_SECRET = original;

      const ours = await gateway.tokenize(VALID_CARD);
      const theirs = await otherGateway.tokenize(VALID_CARD);

      if (ours.status !== 'succeeded' || theirs.status !== 'succeeded') {
        throw new Error('expected both tokenizations to succeed');
      }
      expect(ours.fingerprint).toMatch(HEX_64);
      expect(theirs.fingerprint).toMatch(HEX_64);
      expect(theirs.fingerprint).not.toBe(ours.fingerprint);
      expect(ours.fingerprint).not.toContain('4242424242424242');
      expect(ours.token).not.toContain('4242424242424242');
    });

    it('declines 4000 0000 0000 0002 with card_declined (CARD-05)', async () => {
      const result = await gateway.tokenize(DECLINED_CARD);

      expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
    });

    it('tokenizes 4000 0000 0000 0341 to a sim_pm_decline_ token (CARD-08)', async () => {
      const result = await gateway.tokenize(TOKEN_DECLINED_CARD);

      expect(result).toEqual({
        status: 'succeeded',
        token: expect.stringMatching(/^sim_pm_decline_[0-9a-f-]{36}$/),
        fingerprint: expect.stringMatching(HEX_64),
      });
    });
  });

  describe('token charges', () => {
    it('charges a sim_pm_ token successfully (CARD-08)', async () => {
      const tokenized = await gateway.tokenize(VALID_CARD);
      if (tokenized.status !== 'succeeded') {
        throw new Error('expected tokenize to succeed');
      }

      const result = await gateway.charge({
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'token', token: tokenized.token },
      });

      expect(result).toEqual({
        status: 'succeeded',
        providerPaymentId: expect.stringMatching(/^sim_/),
      });
    });

    it('declines a charge on the 0341 card token with card_declined (CARD-08 AC 10)', async () => {
      const tokenized = await gateway.tokenize(TOKEN_DECLINED_CARD);
      if (tokenized.status !== 'succeeded') {
        throw new Error('expected tokenize to succeed');
      }

      const result = await gateway.charge({
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'token', token: tokenized.token },
      });

      expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
    });
  });

  it('resolves detach', async () => {
    await expect(gateway.detach('sim_pm_x')).resolves.toBeUndefined();
  });
});
