import { z } from 'zod';

export const environmentSchema = z.enum(['test', 'development', 'production']);

export const databaseSchema = z
  .object({
    host: z.string().optional(),
    database: z.string().optional(),
    password: z.string().optional(),
    port: z.coerce.number().int().min(1).max(65535).default(5432),
    url: z
      .string()
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value), {
        message: 'A PostgreSQL URL is required',
      })
      .optional(),
    username: z.string().optional(),
    ssl: z.boolean().default(false),
  })
  .superRefine((database, context) => {
    if (!database.url) {
      for (const key of ['host', 'database', 'username', 'password'] as const) {
        if (database[key] === undefined)
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'Required without a database URL',
          });
      }
    } else {
      let mode: string | null;
      try {
        mode = new URL(database.url).searchParams.get('sslmode');
      } catch {
        return; // The URL validator already reports a value-free error.
      }
      if (
        mode &&
        !['disable', 'prefer', 'require', 'verify-ca', 'verify-full'].includes(
          mode,
        )
      )
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: 'Unsupported PostgreSQL TLS mode',
        });
    }
  });

export const redisSchema = z.object({
  host: z.string(),
  port: z.coerce.number(),
});

export const codeSenderSchema = z.enum(['log', 'disabled']);

export const authSchema = z.object({
  jwtSecret: z.string().min(32),
  codeSender: codeSenderSchema.default('log'),
});

export const billingSchema = z.object({
  fingerprintSecret: z.string().min(32),
});

export const timeZoneSchema = z
  .string()
  .default('UTC')
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-CA', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'app.timeZone must be a valid IANA time zone' },
  );

export const appSchema = z.object({
  timeZone: timeZoneSchema,
  trustProxy: z.array(z.string().min(1)).default([]),
});

export const admissionSchema = z.object({
  maxConcurrent: z.coerce.number().int().positive().default(100),
});

export const demoSchema = z.object({
  enabled: z.boolean().default(false),
  maxRequests: z.coerce.number().int().positive().max(10000).default(60),
  windowMs: z.coerce.number().int().positive().max(86400000).default(60000),
  maxBuckets: z.coerce.number().int().positive().max(100000).default(10000),
});

const isProductionSecret = (value: string) =>
  value.length >= 32 &&
  value === value.trim() &&
  !/^(.)\1+$/.test(value) &&
  !/change-me|changeme|replace-me|placeholder|example|default|development|test-secret|your-secret/i.test(
    value,
  );

export const configSchema = z
  .object({
    env: environmentSchema,
    demo: demoSchema.default({ enabled: false }),
    port: z.coerce.number().positive().int(),
    database: databaseSchema,
    redis: redisSchema,
    auth: authSchema,
    billing: billingSchema,
    app: appSchema.default({ timeZone: 'UTC' }),
    admission: admissionSchema.default({ maxConcurrent: 100 }),
  })
  .refine(
    (config) =>
      !(config.env === 'production' && config.auth.codeSender === 'log'),
    {
      message: 'auth.codeSender cannot be "log" in production',
      path: ['auth', 'codeSender'],
    },
  )
  .superRefine((config, context) => {
    if (config.auth.codeSender === 'disabled' && !config.demo.enabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['auth', 'codeSender'],
        message: 'Disabled email delivery requires demo mode',
      });
    }
    if (config.env === 'production') {
      for (const [path, value] of [
        [['auth', 'jwtSecret'], config.auth.jwtSecret],
        [['billing', 'fingerprintSecret'], config.billing.fingerprintSecret],
      ] as const) {
        if (!isProductionSecret(value))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [...path],
            message: 'A strong production secret is required',
          });
      }
    }
  });
