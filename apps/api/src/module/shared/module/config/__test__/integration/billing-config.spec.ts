import { ConfigException } from '@sharedModules/config/exception/config.exception';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';

describe('Billing configuration', () => {
  const originalSecret = process.env.BILLING_FINGERPRINT_SECRET;

  const originalGateway = process.env.BILLING_GATEWAY;
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  };

  afterEach(() => {
    restore('BILLING_GATEWAY', originalGateway);
    restore('STRIPE_SECRET_KEY', originalStripeKey);
    if (originalSecret === undefined) {
      delete process.env.BILLING_FINGERPRINT_SECRET;
    } else {
      process.env.BILLING_FINGERPRINT_SECRET = originalSecret;
    }
  });

  it('reads billing.fingerprintSecret from BILLING_FINGERPRINT_SECRET', () => {
    const secret = 'a'.repeat(32) + '-explicit-fingerprint-secret';
    process.env.BILLING_FINGERPRINT_SECRET = secret;

    const configService = new ConfigService(factory());

    expect(configService.get('billing.fingerprintSecret')).toBe(secret);
  });

  it('throws ConfigException when BILLING_FINGERPRINT_SECRET is missing', () => {
    delete process.env.BILLING_FINGERPRINT_SECRET;

    expect(() => factory()).toThrow(ConfigException);
  });

  it('throws ConfigException when BILLING_FINGERPRINT_SECRET is shorter than 32 characters', () => {
    process.env.BILLING_FINGERPRINT_SECRET = 'b'.repeat(31);

    expect(() => factory()).toThrow(ConfigException);
  });

  it('accepts a BILLING_FINGERPRINT_SECRET of exactly 32 characters', () => {
    process.env.BILLING_FINGERPRINT_SECRET = 'c'.repeat(32);

    expect(factory().billing.fingerprintSecret).toBe('c'.repeat(32));
  });

  describe('gateway selection', () => {
    beforeEach(() => {
      process.env.BILLING_FINGERPRINT_SECRET = 'd'.repeat(32);
      delete process.env.BILLING_GATEWAY;
      delete process.env.STRIPE_SECRET_KEY;
    });

    it('defaults billing.gateway to simulated', () => {
      expect(factory().billing.gateway).toBe('simulated');
    });

    it('accepts stripe with an sk_test_ key', () => {
      process.env.BILLING_GATEWAY = 'stripe';
      process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';

      const billing = factory().billing;

      expect(billing.gateway).toBe('stripe');
      expect(billing.stripeSecretKey).toBe('sk_test_abc123');
    });

    it('accepts stripe with an rk_test_ key', () => {
      process.env.BILLING_GATEWAY = 'stripe';
      process.env.STRIPE_SECRET_KEY = 'rk_test_abc123';

      expect(factory().billing.gateway).toBe('stripe');
    });

    it('rejects stripe without a key', () => {
      process.env.BILLING_GATEWAY = 'stripe';

      expect(() => factory()).toThrow(ConfigException);
      expect(() => factory()).toThrow('Stripe requires a test-mode secret key');
    });

    it('rejects stripe with a live key', () => {
      process.env.BILLING_GATEWAY = 'stripe';
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc123';

      expect(() => factory()).toThrow('Stripe requires a test-mode secret key');
    });

    it('ignores the key when the gateway is simulated', () => {
      process.env.BILLING_GATEWAY = 'simulated';
      process.env.STRIPE_SECRET_KEY = 'sk_live_abc123';

      expect(factory().billing.gateway).toBe('simulated');
    });

    it('rejects an unknown gateway', () => {
      process.env.BILLING_GATEWAY = 'paypal';

      expect(() => factory()).toThrow(ConfigException);
    });
  });
});
