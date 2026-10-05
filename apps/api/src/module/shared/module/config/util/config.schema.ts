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

export const codeSenderSchema = z.enum(['log']);

export const authSchema = z.object({
  jwtSecret: z.string().min(32),
  codeSender: codeSenderSchema.default('log'),
});

export const configSchema = z
  .object({
    env: environmentSchema,
    port: z.coerce.number().positive().int(),
    database: databaseSchema,
    redis: redisSchema,
    auth: authSchema,
  })
  .refine(
    (config) =>
      !(config.env === 'production' && config.auth.codeSender === 'log'),
    {
      message: 'auth.codeSender cannot be "log" in production',
      path: ['auth', 'codeSender'],
    },
  );
