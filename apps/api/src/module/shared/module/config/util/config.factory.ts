import { ConfigException } from '../exception/config.exception';
import { configSchema } from './config.schema';
import { Config } from './config.type';

export const factory = (): Config => {
  const result = configSchema.safeParse({
    env: process.env.NODE_ENV,
    demo: {
      enabled: process.env.DEMO_MODE === 'true',
      maxRequests: process.env.DEMO_MAX_REQUESTS || undefined,
      windowMs: process.env.DEMO_WINDOW_MS || undefined,
      maxBuckets: process.env.DEMO_MAX_BUCKETS || undefined,
    },
    port: process.env.PORT,
    database: {
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      password: process.env.DATABASE_PASSWORD,
      port: process.env.DATABASE_PORT,
      url: process.env.DATABASE_URL || undefined,
      ssl: process.env.DATABASE_SSL === 'true',
      username: process.env.DATABASE_USERNAME,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      codeSender: process.env.AUTH_CODE_SENDER || undefined,
    },
    billing: {
      fingerprintSecret: process.env.BILLING_FINGERPRINT_SECRET,
    },
    app: {
      timeZone: process.env.APP_TIME_ZONE || undefined,
      trustProxy: (process.env.TRUST_PROXY || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      clientAddressSecret: process.env.CLIENT_ADDRESS_SECRET || undefined,
    },
    admission: {
      maxConcurrent: process.env.ADMISSION_MAX_CONCURRENT || undefined,
    },
  });

  if (result.success) {
    return result.data;
  }

  throw new ConfigException(
    `Invalid application configuration: ${result.error.message}`,
  );
};
