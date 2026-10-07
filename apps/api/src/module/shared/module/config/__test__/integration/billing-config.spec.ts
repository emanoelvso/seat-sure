import { ConfigException } from '@sharedModules/config/exception/config.exception';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';

describe('Billing configuration', () => {
  const originalSecret = process.env.BILLING_FINGERPRINT_SECRET;

  afterEach(() => {
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
});
