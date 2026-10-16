import {
  appSchema,
  demoSchema,
} from '@sharedModules/config/util/config.schema';

describe('Demo request configuration (REL-20)', () => {
  it('defaults to disabled with 60 fields/minute and 10000 buckets, trusting no proxies', () => {
    expect(demoSchema.parse({})).toEqual({
      enabled: false,
      maxRequests: 60,
      windowMs: 60000,
      maxBuckets: 10000,
    });
    expect(appSchema.parse({}).trustProxy).toEqual([]);
  });

  it.each([
    ['maxRequests', 0],
    ['maxRequests', 10001],
    ['maxRequests', 1.5],
    ['windowMs', 0],
    ['windowMs', 86400001],
    ['maxBuckets', 0],
    ['maxBuckets', 100001],
  ])(
    'rejects %s outside bounded positive integer limits (%s)',
    (key, value) => {
      expect(demoSchema.safeParse({ [key]: value }).success).toBe(false);
    },
  );

  it('preserves explicit request bounds and proxy allowlist', () => {
    expect(
      demoSchema.parse({
        enabled: true,
        maxRequests: '2',
        windowMs: '1000',
        maxBuckets: '2',
      }),
    ).toEqual({ enabled: true, maxRequests: 2, windowMs: 1000, maxBuckets: 2 });
    expect(
      appSchema.parse({ trustProxy: ['127.0.0.1', '192.0.2.0/24'] }).trustProxy,
    ).toEqual(['127.0.0.1', '192.0.2.0/24']);
  });
});
