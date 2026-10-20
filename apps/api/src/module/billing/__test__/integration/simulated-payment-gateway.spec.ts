import { BillingModule } from '@billingModule/billing.module';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { BillingSimulatedPaymentRepository } from '@billingModule/persistence/repository/billing-simulated-payment.repository';
import { randomUUID } from 'crypto';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
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

const DECLINED_CARD = {
  ...VALID_CARD,
  number: '4000 0000 0000 0002',
};

const TOKEN_DECLINED_CARD = {
  ...VALID_CARD,
  number: '4000 0000 0000 0341',
};

const CHALLENGE_CARD = {
  ...VALID_CARD,
  number: '4000 0027 6000 3184',
};

const AMOUNT = { amountCents: 26000, currency: 'USD' };
const cardSource = (card: typeof VALID_CARD) =>
  ({ type: 'card', card }) as const;
const tokenSource = (token: string) => ({ type: 'token', token }) as const;
const keyOf = () => `${randomUUID()}:authorize`;

const SIM_TOKEN = /^sim_pm_[0-9a-f-]{36}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

describe('SimulatedPaymentGateway (integration)', () => {
  let module: TestingModule;
  let gateway: SimulatedPaymentGateway & PaymentGateway;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
    gateway = module.get(SimulatedPaymentGateway);
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingSimulatedPayment).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingSimulatedPayment).del();
  });

  const authorizeOrFail = async (card = VALID_CARD) => {
    const result = await gateway.authorize(
      { ...AMOUNT, source: cardSource(card) },
      keyOf(),
    );
    if (result.status === 'failed') {
      throw new Error('expected the authorization to succeed');
    }
    return result;
  };

  describe('authorize', () => {
    it('authorizes a non-test-declined number with a sim_-prefixed id (PAY-37)', async () => {
      const result = await gateway.authorize(
        { ...AMOUNT, source: cardSource(VALID_CARD) },
        keyOf(),
      );

      expect(result).toEqual({
        status: 'authorized',
        providerPaymentId: expect.stringMatching(/^sim_/),
      });
    });

    it('returns different provider payment ids for two keys', async () => {
      const first = await authorizeOrFail();
      const second = await authorizeOrFail();

      expect(first.providerPaymentId).not.toBe(second.providerPaymentId);
    });

    it('declines 4000000000000002 with card_declined (PAY-40)', async () => {
      const result = await gateway.authorize(
        { ...AMOUNT, source: cardSource(DECLINED_CARD) },
        keyOf(),
      );

      expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
    });

    it('declines a typed authorization on the 0341 card, matching its saved token', async () => {
      const result = await gateway.authorize(
        { ...AMOUNT, source: cardSource(TOKEN_DECLINED_CARD) },
        keyOf(),
      );

      expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
    });

    it('authorizes a sim_pm_ token (CARD-08)', async () => {
      const tokenized = await gateway.tokenize(VALID_CARD);
      if (tokenized.status !== 'succeeded') {
        throw new Error('expected tokenize to succeed');
      }

      const result = await gateway.authorize(
        { ...AMOUNT, source: tokenSource(tokenized.token) },
        keyOf(),
      );

      expect(result).toEqual({
        status: 'authorized',
        providerPaymentId: expect.stringMatching(/^sim_/),
      });
    });

    it('declines the 0341 card token with card_declined (CARD-08 AC 10)', async () => {
      const tokenized = await gateway.tokenize(TOKEN_DECLINED_CARD);
      if (tokenized.status !== 'succeeded') {
        throw new Error('expected tokenize to succeed');
      }

      const result = await gateway.authorize(
        { ...AMOUNT, source: tokenSource(tokenized.token) },
        keyOf(),
      );

      expect(result).toEqual({ status: 'failed', reason: 'card_declined' });
    });

    it('returns the first result and one row for a repeated key (GW-03)', async () => {
      const key = keyOf();
      const input = { ...AMOUNT, source: cardSource(VALID_CARD) };

      const first = await gateway.authorize(input, key);
      const second = await gateway.authorize(input, key);

      expect(second).toEqual(first);
      expect(
        await testDbClient(Tables.BillingSimulatedPayment).select(),
      ).toHaveLength(1);
    });

    it('creates a single row when two calls with one key run together (GW-03)', async () => {
      const key = keyOf();
      const input = { ...AMOUNT, source: cardSource(VALID_CARD) };

      const [first, second] = await Promise.all([
        gateway.authorize(input, key),
        gateway.authorize(input, key),
      ]);

      expect(second).toEqual(first);
      expect(
        await testDbClient(Tables.BillingSimulatedPayment).select(),
      ).toHaveLength(1);
    });

    it('exposes its provider and accepts typed cards', () => {
      expect(gateway.provider).toBe('simulated');
      expect(gateway.acceptsTypedCards).toBe(true);
    });
  });

  describe('3-D Secure card 4000002760003184 (GW-19)', () => {
    it('requires action for the typed card with a sim_secret_ client secret', async () => {
      const result = await gateway.authorize(
        { ...AMOUNT, source: cardSource(CHALLENGE_CARD) },
        keyOf(),
      );

      expect(result).toEqual({
        status: 'requires_action',
        providerPaymentId: expect.stringMatching(/^sim_/),
        clientSecret: expect.stringMatching(/^sim_secret_/),
      });
    });

    it('tokenizes to a sim_pm_3ds_ token that requires action as well', async () => {
      const tokenized = await gateway.tokenize(CHALLENGE_CARD);
      if (tokenized.status !== 'succeeded') {
        throw new Error('expected tokenize to succeed');
      }
      expect(tokenized.token).toMatch(/^sim_pm_3ds_/);

      const result = await gateway.authorize(
        { ...AMOUNT, source: tokenSource(tokenized.token) },
        keyOf(),
      );

      expect(result).toEqual({
        status: 'requires_action',
        providerPaymentId: expect.stringMatching(/^sim_/),
        clientSecret: expect.stringMatching(/^sim_secret_/),
      });
    });

    it('gives each challenge its own client secret', async () => {
      const first = await authorizeOrFail(CHALLENGE_CARD);
      const second = await authorizeOrFail(CHALLENGE_CARD);

      expect(first).toHaveProperty('clientSecret');
      expect(second).toHaveProperty('clientSecret');
      expect((first as { clientSecret: string }).clientSecret).not.toBe(
        (second as { clientSecret: string }).clientSecret,
      );
    });

    it('stays requires_action until the bank answers', async () => {
      const { providerPaymentId, ...challenge } =
        await authorizeOrFail(CHALLENGE_CARD);

      expect(await gateway.getPayment(providerPaymentId)).toEqual({
        status: 'requires_action',
        clientSecret: (challenge as { clientSecret: string }).clientSecret,
      });
    });

    it('is authorized after approve', async () => {
      const result = await authorizeOrFail(CHALLENGE_CARD);
      const { clientSecret } = result as { clientSecret: string };

      expect(await gateway.approve(clientSecret)).toBe(true);
      expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
        status: 'authorized',
      });
    });

    it('is authentication_failed after fail', async () => {
      const result = await authorizeOrFail(CHALLENGE_CARD);
      const { clientSecret } = result as { clientSecret: string };

      expect(await gateway.fail(clientSecret)).toBe(true);
      expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
        status: 'authentication_failed',
      });
    });

    it('refuses approve and fail on a settled secret and changes nothing', async () => {
      const result = await authorizeOrFail(CHALLENGE_CARD);
      const { clientSecret } = result as { clientSecret: string };
      await gateway.approve(clientSecret);

      expect(await gateway.approve(clientSecret)).toBe(false);
      expect(await gateway.fail(clientSecret)).toBe(false);
      expect(await gateway.getPayment(result.providerPaymentId)).toEqual({
        status: 'authorized',
      });
    });

    it('refuses an unknown client secret', async () => {
      expect(await gateway.approve('sim_secret_unknown')).toBe(false);
      expect(await gateway.fail('sim_secret_unknown')).toBe(false);
    });

    it('returns the first answer to a repeated key after the challenge is settled', async () => {
      const key = keyOf();
      const input = { ...AMOUNT, source: cardSource(CHALLENGE_CARD) };
      const first = await gateway.authorize(input, key);
      await gateway.approve((first as { clientSecret: string }).clientSecret);

      expect(await gateway.authorize(input, key)).toEqual(first);
    });
  });

  describe('capture, cancel and refund', () => {
    it('reports an authorized payment, then a captured one', async () => {
      const { providerPaymentId } = await authorizeOrFail();
      expect(await gateway.getPayment(providerPaymentId)).toEqual({
        status: 'authorized',
      });

      await gateway.capture(providerPaymentId, `${randomUUID()}:capture`);

      expect(await gateway.getPayment(providerPaymentId)).toEqual({
        status: 'captured',
      });
    });

    it('treats a repeated capture as done', async () => {
      const { providerPaymentId } = await authorizeOrFail();
      await gateway.capture(providerPaymentId, 'k:capture');

      await expect(
        gateway.capture(providerPaymentId, 'k:capture'),
      ).resolves.toBeUndefined();
    });

    it('cancels an authorized payment, and a repeated cancel is done', async () => {
      const { providerPaymentId } = await authorizeOrFail();

      await gateway.cancel(providerPaymentId, 'k:cancel');
      await gateway.cancel(providerPaymentId, 'k:cancel');

      expect(await gateway.getPayment(providerPaymentId)).toEqual({
        status: 'cancelled',
      });
    });

    it('cancels a payment that still awaits its challenge', async () => {
      const { providerPaymentId } = await authorizeOrFail(CHALLENGE_CARD);

      await gateway.cancel(providerPaymentId, 'k:cancel');

      expect(await gateway.getPayment(providerPaymentId)).toEqual({
        status: 'cancelled',
      });
    });

    it('refuses to capture a cancelled payment and to cancel a captured one', async () => {
      const cancelled = await authorizeOrFail();
      await gateway.cancel(cancelled.providerPaymentId, 'k:cancel');
      const captured = await authorizeOrFail();
      await gateway.capture(captured.providerPaymentId, 'k:capture');

      await expect(
        gateway.capture(cancelled.providerPaymentId, 'k:capture'),
      ).rejects.toThrow();
      await expect(
        gateway.cancel(captured.providerPaymentId, 'k:cancel'),
      ).rejects.toThrow();
    });

    it('refuses to capture an unknown payment', async () => {
      await expect(
        gateway.capture(`sim_${randomUUID()}`, 'k:capture'),
      ).rejects.toThrow();
    });

    it('refunds a captured payment and resolves a refund of an unknown one', async () => {
      const { providerPaymentId } = await authorizeOrFail();
      await gateway.capture(providerPaymentId, 'k:capture');

      await gateway.refund(providerPaymentId, 'k:refund');

      expect(
        (await testDbClient(Tables.BillingSimulatedPayment).first()).status,
      ).toBe('refunded');
      await expect(
        gateway.refund('sim_x', 'k:refund'),
      ).resolves.toBeUndefined();
    });
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
        module.get(BillingSimulatedPaymentRepository, { strict: false }),
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

  it('resolves detach', async () => {
    await expect(gateway.detach('sim_pm_x')).resolves.toBeUndefined();
  });

  it('lists a customer as found with no payment methods (REC-05)', async () => {
    await expect(
      gateway.listCustomerPaymentMethods('sim_cus_x'),
    ).resolves.toEqual({ status: 'found', methods: [] });
  });

  it('resolves deleteCustomer (ERASE-03)', async () => {
    await expect(gateway.deleteCustomer('sim_cus_x')).resolves.toBeUndefined();
  });
});
