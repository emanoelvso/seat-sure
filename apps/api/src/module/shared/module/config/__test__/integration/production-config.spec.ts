import { FactoryProvider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { IdentityModule } from '@identityModule/identity.module';
import { DisabledCodeSender } from '@identityModule/integration/provider/disabled-code-sender.provider';
import { LogCodeSender } from '@identityModule/integration/provider/log-code-sender.provider';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { configSchema } from '@sharedModules/config/util/config.schema';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

const strongSecret = ['7ac15f30', '9bd248e6', '8d31a502', '5fc973be'].join('');
const fixture = () => ({
  env: 'production',
  port: 3000,
  database: {
    host: 'localhost',
    database: 'fixture',
    password: 'fixture',
    port: 5432,
    url: 'postgresql://localhost/fixture',
    username: 'fixture',
  },
  redis: { host: 'localhost', port: 6379 },
  auth: { jwtSecret: strongSecret, codeSender: 'disabled' },
  billing: { fingerprintSecret: strongSecret },
  demo: { enabled: true },
});

describe('Production release configuration (REL-03, REL-19)', () => {
  it.each([
    'short',
    '',
    ' '.repeat(32),
    'x'.repeat(32),
    ' ' + strongSecret,
    strongSecret + ' ',
    ...[
      'change-me',
      'changeme',
      'replace-me',
      'placeholder',
      'example',
      'default',
      'development',
      'test-secret',
      'your-secret',
    ].map((value) => strongSecret + value.toUpperCase()),
  ])('rejects unsafe secret case %# without exposing it', (secret) => {
    for (const section of ['auth', 'billing'] as const) {
      const input = fixture();
      if (section === 'auth') input.auth.jwtSecret = secret;
      else input.billing.fingerprintSecret = secret;
      const result = configSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.join('.') ===
              (section === 'auth'
                ? 'auth.jwtSecret'
                : 'billing.fingerprintSecret'),
          ),
        ).toBe(true);
        if (secret) expect(result.error.message).not.toContain(secret);
      }
    }
  });

  it('accepts strong production secrets and explicit demo disabled sender', () => {
    const result = configSchema.parse(fixture());
    expect(result.auth.jwtSecret).toBe(strongSecret);
    expect(result.billing.fingerprintSecret).toBe(strongSecret);
    expect(result.demo.enabled).toBe(true);
    expect(result.auth.codeSender).toBe('disabled');
  });

  it.each(['test', 'development'])(
    'preserves %s repeated-secret/log behavior and defaults demo off',
    (env) => {
      const input = {
        ...fixture(),
        env,
        demo: undefined,
        auth: { jwtSecret: 'a'.repeat(32), codeSender: 'log' },
        billing: { fingerprintSecret: 'b'.repeat(32) },
      };
      expect(configSchema.parse(input).demo.enabled).toBe(false);
      expect(configSchema.parse(input).auth.codeSender).toBe('log');
    },
  );

  it('rejects production log sender even with demo enabled', () => {
    const input = fixture();
    input.auth.codeSender = 'log';
    expect(configSchema.safeParse(input).success).toBe(false);
  });

  it('rejects disabled sender without explicit demo mode', () => {
    const input = fixture();
    input.demo.enabled = false;
    expect(configSchema.safeParse(input).success).toBe(false);
  });

  it('binds a disabled sender in the real Identity module provider without logging', async () => {
    const providers = Reflect.getMetadata(
      'providers',
      IdentityModule,
    ) as FactoryProvider[];
    const provider = providers.find((value) => value.provide === CodeSender)!;
    const log = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        provider,
        {
          provide: ConfigService,
          useValue: new ConfigService(configSchema.parse(fixture())),
        },
        { provide: AppLogger, useValue: { log } },
      ],
    }).compile();
    const sender = module.get<CodeSender>(CodeSender);
    expect(sender).toBeInstanceOf(DisabledCodeSender);
    expect(sender).not.toBeInstanceOf(LogCodeSender);
    await expect(
      sender.send({
        email: 'visitor@demo.invalid',
        purpose: 'verify_email',
        code: '123456',
      }),
    ).rejects.toThrow('Email delivery is disabled');
    expect(log).not.toHaveBeenCalled();
    await module.close();
  });
});
