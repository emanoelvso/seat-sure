import { z } from 'zod';

export const environmentSchema = z.enum(['test', 'development', 'production']);

export const databaseSchema = z.object({
  host: z.string(),
  database: z.string(),
  password: z.string(),
  port: z.coerce.number(),
  url: z.string().startsWith('postgresql://'),
  username: z.string(),
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
});

export const admissionSchema = z.object({
  maxConcurrent: z.coerce.number().int().positive().default(100),
});

export const demoSchema = z.object({ enabled: z.boolean().default(false) });

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
