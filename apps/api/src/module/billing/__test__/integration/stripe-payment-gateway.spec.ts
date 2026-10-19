import { BillingModule } from '@billingModule/billing.module';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { StripePaymentGateway } from '@billingModule/integration/provider/stripe-payment-gateway.provider';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const stub = () => ({
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    capture: jest.fn().mockResolvedValue({}),
    cancel: jest.fn().mockResolvedValue({}),
  },
  refunds: { create: jest.fn().mockResolvedValue({}) },
  paymentMethods: {
    detach: jest.fn().mockResolvedValue({}),
    attach: jest.fn(),
  },
  customers: { create: jest.fn() },
});

const INPUT = {
  amountCents: 26000,
  currency: 'USD',
  source: { type: 'token', token: 'pm_card_visa' },
} as const;
const KEY = 'payment-1:authorize';

describe('StripePaymentGateway (integration, stub client)', () => {
  let client: ReturnType<typeof stub>;
  let gateway: StripePaymentGateway;
  let module: TestingModule;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingCustomer).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingCustomer).del();
    client = stub();
    gateway = new StripePaymentGateway(
      client as unknown as Stripe,
      module.get(ConfigService),
      module.get(BillingCustomerRepository),
    );
  });

  describe('authorize', () => {
    it('creates a confirmed manual-capture card intent with the idempotency key', async () => {
      client.paymentIntents.create.mockResolvedValue({
        id: 'pi_1',
        status: 'requires_capture',
      });

      await gateway.authorize(INPUT, KEY);

      expect(client.paymentIntents.create).toHaveBeenCalledTimes(1);
      expect(client.paymentIntents.create).toHaveBeenCalledWith(
        {
          amount: 26000,
          currency: 'usd',
          payment_method: 'pm_card_visa',
          confirm: true,
          capture_method: 'manual',
          allowed_payment_method_types: ['card'],
        },
        { idempotencyKey: KEY },
      );
    });

    it('sends the customer of a saved card', async () => {
      client.paymentIntents.create.mockResolvedValue({
        id: 'pi_1',
        status: 'requires_capture',
      });

      await gateway.authorize(
        { ...INPUT, source: { ...INPUT.source, customerId: 'cus_1' } },
        KEY,
      );

      expect(client.paymentIntents.create.mock.calls[0][0]).toMatchObject({
        customer: 'cus_1',
      });
    });

    it('maps requires_capture to authorized', async () => {
      client.paymentIntents.create.mockResolvedValue({
        id: 'pi_1',
        status: 'requires_capture',
      });

      await expect(gateway.authorize(INPUT, KEY)).resolves.toEqual({
        status: 'authorized',
        providerPaymentId: 'pi_1',
      });
    });

    it('maps requires_action to the client secret', async () => {
      client.paymentIntents.create.mockResolvedValue({
        id: 'pi_2',
        status: 'requires_action',
        client_secret: 'pi_2_secret_x',
      });

      await expect(gateway.authorize(INPUT, KEY)).resolves.toEqual({
        status: 'requires_action',
        providerPaymentId: 'pi_2',
        clientSecret: 'pi_2_secret_x',
      });
    });

    it('maps a StripeCardError to a failed card_declined', async () => {
      client.paymentIntents.create.mockRejectedValue(
        new Stripe.errors.StripeCardError({
          type: 'card_error',
          message: 'Your card was declined.',
          code: 'card_declined',
        }),
      );

      await expect(gateway.authorize(INPUT, KEY)).resolves.toEqual({
        status: 'failed',
        reason: 'card_declined',
      });
    });

    it.each([
      [
        'connection',
        new Stripe.errors.StripeConnectionError({
          type: 'api_error',
          message: 'down',
        }),
      ],
      [
        'authentication',
        new Stripe.errors.StripeAuthenticationError({
          type: 'authentication_error',
          message: 'bad key',
        }),
      ],
      [
        'rate limit',
        new Stripe.errors.StripeRateLimitError({
          type: 'rate_limit_error',
          message: 'slow',
        }),
      ],
    ])('throws on a %s error', async (_name, error) => {
      client.paymentIntents.create.mockRejectedValue(error);

      await expect(gateway.authorize(INPUT, KEY)).rejects.toBe(error);
    });

    it('refuses a typed card without calling Stripe', async () => {
      await expect(
        gateway.authorize(
          {
            ...INPUT,
            source: {
              type: 'card',
              card: {
                number: '4242424242424242',
                holder: 'Jane',
                expiry: '06/30',
                cvv: '123',
              },
            },
          },
          KEY,
        ),
      ).rejects.toThrow();
      expect(client.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('throws on a status it cannot map', async () => {
      client.paymentIntents.create.mockResolvedValue({
        id: 'pi_3',
        status: 'processing',
      });

      await expect(gateway.authorize(INPUT, KEY)).rejects.toThrow();
    });
  });

  describe('getPayment', () => {
    it.each([
      ['requires_capture', { status: 'authorized' }],
      ['requires_payment_method', { status: 'authentication_failed' }],
      ['canceled', { status: 'cancelled' }],
      ['succeeded', { status: 'captured' }],
    ])('maps %s', async (status, expected) => {
      client.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_1', status });

      await expect(gateway.getPayment('pi_1')).resolves.toEqual(expected);
      expect(client.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1');
    });

    it('maps requires_action with its client secret', async () => {
      client.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_1',
        status: 'requires_action',
        client_secret: 'pi_1_secret_x',
      });

      await expect(gateway.getPayment('pi_1')).resolves.toEqual({
        status: 'requires_action',
        clientSecret: 'pi_1_secret_x',
      });
    });
  });

  describe('capture, cancel and refund', () => {
    it('captures with its idempotency key', async () => {
      await gateway.capture('pi_1', 'payment-1:capture');

      expect(client.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_1',
        {},
        { idempotencyKey: 'payment-1:capture' },
      );
    });

    it('cancels with its idempotency key', async () => {
      await gateway.cancel('pi_1', 'payment-1:cancel');

      expect(client.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_1',
        {},
        { idempotencyKey: 'payment-1:cancel' },
      );
    });

    it('refunds the intent with its idempotency key', async () => {
      await gateway.refund('pi_1', 'payment-1:refund');

      expect(client.refunds.create).toHaveBeenCalledWith(
        { payment_intent: 'pi_1' },
        { idempotencyKey: 'payment-1:refund' },
      );
    });

    it('lets a capture failure propagate', async () => {
      client.paymentIntents.capture.mockRejectedValue(new Error('boom'));

      await expect(gateway.capture('pi_1', 'k')).rejects.toThrow('boom');
    });
  });

  it('does not tokenize typed cards', () => {
    expect(gateway.acceptsTypedCards).toBe(false);
    expect(gateway.provider).toBe('stripe');
  });

  describe('attachPaymentMethod', () => {
    const userId = randomUUID();
    const method = (overrides = {}) => ({
      id: 'pm_1',
      billing_details: { name: 'Jane Doe' },
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 6,
        exp_year: 2030,
        fingerprint: 'stripe-fp-1',
      },
      ...overrides,
    });

    beforeEach(() => {
      client.customers.create.mockResolvedValue({ id: 'cus_1' });
      client.paymentMethods.attach.mockResolvedValue(method());
    });

    it('attaches to a new customer and returns display data with a 64-hex fingerprint', async () => {
      const result = await gateway.attachPaymentMethod('pm_1', userId);

      expect(client.paymentMethods.attach).toHaveBeenCalledWith('pm_1', {
        customer: 'cus_1',
      });
      expect(result).toEqual({
        status: 'succeeded',
        token: 'pm_1',
        customerId: 'cus_1',
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        brand: 'visa',
        last4: '4242',
        expMonth: 6,
        expYear: 2030,
        holder: 'Jane Doe',
      });
      expect(JSON.stringify(result)).not.toContain('stripe-fp-1');
    });

    it('creates the customer once per user and reuses it', async () => {
      await gateway.attachPaymentMethod('pm_1', userId);
      await gateway.attachPaymentMethod('pm_2', userId);

      expect(client.customers.create).toHaveBeenCalledTimes(1);
      expect(client.paymentMethods.attach).toHaveBeenLastCalledWith('pm_2', {
        customer: 'cus_1',
      });
      const rows = await testDbClient(Tables.BillingCustomer).where({ userId });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        provider: 'stripe',
        providerCustomerId: 'cus_1',
      });
    });

    it('gives the same fingerprint to the same card and another to a different one', async () => {
      const fingerprintOf = (result: unknown) =>
        (result as { fingerprint: string }).fingerprint;
      const first = await gateway.attachPaymentMethod('pm_1', userId);
      const again = await gateway.attachPaymentMethod('pm_2', userId);
      client.paymentMethods.attach.mockResolvedValue(
        method({ card: { ...method().card, fingerprint: 'stripe-fp-2' } }),
      );
      const other = await gateway.attachPaymentMethod('pm_3', userId);

      expect(fingerprintOf(again)).toBe(fingerprintOf(first));
      expect(fingerprintOf(other)).not.toBe(fingerprintOf(first));
    });

    it('maps a card error on attach to declined', async () => {
      client.paymentMethods.attach.mockRejectedValue(
        new Stripe.errors.StripeCardError({
          type: 'card_error',
          message: 'declined',
          code: 'card_declined',
        }),
      );

      await expect(
        gateway.attachPaymentMethod('pm_1', userId),
      ).resolves.toEqual({ status: 'failed', reason: 'card_declined' });
    });

    it('throws on a non-card error', async () => {
      client.paymentMethods.attach.mockRejectedValue(
        new Stripe.errors.StripeConnectionError({
          type: 'api_error',
          message: 'down',
        }),
      );

      await expect(
        gateway.attachPaymentMethod('pm_1', userId),
      ).rejects.toThrow();
    });

    it('detaches with the token', async () => {
      await gateway.detach('pm_1');

      expect(client.paymentMethods.detach).toHaveBeenCalledWith('pm_1');
    });
  });
});
