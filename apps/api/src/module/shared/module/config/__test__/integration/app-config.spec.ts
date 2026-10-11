import { ConfigException } from '@sharedModules/config/exception/config.exception';
import { factory } from '@sharedModules/config/util/config.factory';

describe('App configuration', () => {
  const originalTimeZone = process.env.APP_TIME_ZONE;

  afterEach(() => {
    if (originalTimeZone === undefined) {
      delete process.env.APP_TIME_ZONE;
    } else {
      process.env.APP_TIME_ZONE = originalTimeZone;
    }
  });

  it('defaults app.timeZone to UTC when APP_TIME_ZONE is unset', () => {
    delete process.env.APP_TIME_ZONE;

    expect(factory().app.timeZone).toBe('UTC');
  });

  it('defaults app.timeZone to UTC when APP_TIME_ZONE is empty', () => {
    process.env.APP_TIME_ZONE = '';

    expect(factory().app.timeZone).toBe('UTC');
  });

  it('reads app.timeZone from APP_TIME_ZONE', () => {
    process.env.APP_TIME_ZONE = 'Asia/Tokyo';

    expect(factory().app.timeZone).toBe('Asia/Tokyo');
  });

  it('throws ConfigException when APP_TIME_ZONE is not an IANA zone', () => {
    process.env.APP_TIME_ZONE = 'Not/AZone';

    expect(() => factory()).toThrow(ConfigException);
  });
});

describe('Admission configuration', () => {
  const original = process.env.ADMISSION_MAX_CONCURRENT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMISSION_MAX_CONCURRENT;
    } else {
      process.env.ADMISSION_MAX_CONCURRENT = original;
    }
  });

  it('defaults admission.maxConcurrent to 100 when unset or empty', () => {
    delete process.env.ADMISSION_MAX_CONCURRENT;
    expect(factory().admission.maxConcurrent).toBe(100);

    process.env.ADMISSION_MAX_CONCURRENT = '';
    expect(factory().admission.maxConcurrent).toBe(100);
  });

  it('reads admission.maxConcurrent from ADMISSION_MAX_CONCURRENT', () => {
    process.env.ADMISSION_MAX_CONCURRENT = '7';

    expect(factory().admission.maxConcurrent).toBe(7);
  });

  it('throws ConfigException when ADMISSION_MAX_CONCURRENT is not a positive integer', () => {
    process.env.ADMISSION_MAX_CONCURRENT = '0';

    expect(() => factory()).toThrow(ConfigException);
  });
});
