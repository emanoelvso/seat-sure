import { randomUUID } from 'crypto';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  CodeSender,
  SendCodeInput,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { IdentityUser } from '@identityModule/persistence/entity/identity-user.entity';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { DataSource } from 'typeorm';

@Injectable()
class FakeCodeSender implements CodeSender {
  sent: SendCodeInput[] = [];
  shouldThrow = false;

  async send(input: SendCodeInput): Promise<void> {
    if (this.shouldThrow) {
      throw new Error('sender failure');
    }
    this.sent.push(input);
  }

  reset(): void {
    this.sent = [];
    this.shouldThrow = false;
  }
}

// A trivial Query root is required by Nest's code-first GraphQL schema
// builder; this module has no resolver of its own.
@Resolver()
class VerificationCodeProbeResolver {
  @Query(() => Boolean)
  verificationCodeProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({
  imports: [IdentityPersistenceModule, LoggerModule],
  providers: [
    VerificationCodeService,
    { provide: CodeSender, useClass: FakeCodeSender },
    VerificationCodeProbeResolver,
  ],
})
class VerificationCodeProbeModule {}

const buildUser = (email: string): IdentityUser =>
  new IdentityUser({
    id: randomUUID(),
    email,
    passwordHash:
      '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01',
  });

describe('VerificationCodeService (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let service: VerificationCodeService;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([VerificationCodeProbeModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    service = module.get(VerificationCodeService);
    fakeCodeSender = module.get<FakeCodeSender>(CodeSender);
  });

  beforeEach(async () => {
    fakeCodeSender.reset();
    await testDbClient(Tables.IdentityVerificationCode).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('identity'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('issues a 6-digit code, hashed in storage, with a 10-minute expiry and a 60s resend window', async () => {
    const user = buildUser('negar-issue@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');

    const result = await service.issue(user, 'verify_email', now);

    expect(result.codeSent).toBe(true);
    expect(result.resendAvailableAt).toEqual(new Date(now.getTime() + 60_000));
    expect(fakeCodeSender.sent).toHaveLength(1);
    const sentCode = fakeCodeSender.sent[0].code;
    expect(sentCode).toMatch(/^\d{6}$/);

    const row = await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: user.id, purpose: 'verify_email' })
      .first();
    expect(row.codeHash).not.toBe(sentCode);
    expect(new Date(row.expiresAt).getTime()).toBe(now.getTime() + 600_000);
  });

  it('accepts the right code once (AUTH-24)', async () => {
    const user = buildUser('negar-consume-once@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', now);
    const code = fakeCodeSender.sent[0].code;

    await expect(
      service.consume(user, 'verify_email', code, now),
    ).resolves.toBeUndefined();
  });

  it('rejects a second consume of the same code (AUTH-24)', async () => {
    const user = buildUser('negar-consume-twice@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', now);
    const code = fakeCodeSender.sent[0].code;
    await service.consume(user, 'verify_email', code, now);

    await expect(
      service.consume(user, 'verify_email', code, now),
    ).rejects.toMatchObject({ reason: 'CODE_INCORRECT' });
  });

  it('rejects a code differing by one digit and increments failedAttempts (AUTH-21)', async () => {
    const user = buildUser('negar-wrong-digit@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', now);
    const code = fakeCodeSender.sent[0].code;
    const lastDigit = code.slice(-1) as string;
    const wrongLastDigit = lastDigit === '0' ? '1' : '0';
    const wrongCode = code.slice(0, -1) + wrongLastDigit;

    await expect(
      service.consume(user, 'verify_email', wrongCode, now),
    ).rejects.toMatchObject({ reason: 'CODE_INCORRECT' });

    const row = await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: user.id, purpose: 'verify_email' })
      .first();
    expect(row.failedAttempts).toBe(1);
  });

  it('rejects a code 10 minutes and 1 second past issuance with CODE_EXPIRED (AUTH-22)', async () => {
    const user = buildUser('negar-expired@example.com');
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', issuedAt);
    const code = fakeCodeSender.sent[0].code;
    const checkAt = new Date(issuedAt.getTime() + 10 * 60_000 + 1_000);

    await expect(
      service.consume(user, 'verify_email', code, checkAt),
    ).rejects.toMatchObject({ reason: 'CODE_EXPIRED' });
  });

  it('accepts a code checked exactly 10 minutes after issuance (AUTH-22 boundary)', async () => {
    const user = buildUser('negar-boundary@example.com');
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', issuedAt);
    const code = fakeCodeSender.sent[0].code;
    const checkAt = new Date(issuedAt.getTime() + 10 * 60_000);

    await expect(
      service.consume(user, 'verify_email', code, checkAt),
    ).resolves.toBeUndefined();
  });

  it('rejects the right code after 5 wrong tries with CODE_ATTEMPTS_EXCEEDED (AUTH-23)', async () => {
    const user = buildUser('negar-5-wrong@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', now);
    const code = fakeCodeSender.sent[0].code;
    const wrongCode = code.slice(0, -1) + (code.slice(-1) === '0' ? '1' : '0');

    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.consume(user, 'verify_email', wrongCode, now),
      ).rejects.toMatchObject({ reason: 'CODE_INCORRECT' });
    }

    await expect(
      service.consume(user, 'verify_email', code, now),
    ).rejects.toMatchObject({ reason: 'CODE_ATTEMPTS_EXCEEDED' });
  });

  it('accepts the right code after only 4 wrong tries (AUTH-23 boundary)', async () => {
    const user = buildUser('negar-4-wrong@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', now);
    const code = fakeCodeSender.sent[0].code;
    const wrongCode = code.slice(0, -1) + (code.slice(-1) === '0' ? '1' : '0');

    for (let i = 0; i < 4; i += 1) {
      await expect(
        service.consume(user, 'verify_email', wrongCode, now),
      ).rejects.toMatchObject({ reason: 'CODE_INCORRECT' });
    }

    await expect(
      service.consume(user, 'verify_email', code, now),
    ).resolves.toBeUndefined();
  });

  it('invalidates the earlier code once 60s have passed and sends a working new one (AUTH-26)', async () => {
    const user = buildUser('negar-resend-ok@example.com');
    const firstIssueAt = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', firstIssueAt);
    const firstCode = fakeCodeSender.sent[0].code;

    const secondIssueAt = new Date(firstIssueAt.getTime() + 61_000);
    await service.issue(user, 'verify_email', secondIssueAt);
    const secondCode = fakeCodeSender.sent[1].code;

    await expect(
      service.consume(user, 'verify_email', firstCode, secondIssueAt),
    ).rejects.toMatchObject({ reason: 'CODE_INCORRECT' });

    await expect(
      service.consume(user, 'verify_email', secondCode, secondIssueAt),
    ).resolves.toBeUndefined();
  });

  it('rejects a reissue at 59s with RESEND_TOO_SOON and sends nothing (AUTH-27)', async () => {
    const user = buildUser('negar-resend-too-soon@example.com');
    const firstIssueAt = new Date('2026-01-01T00:00:00.000Z');
    await service.issue(user, 'verify_email', firstIssueAt);

    const secondIssueAt = new Date(firstIssueAt.getTime() + 59_000);
    await expect(
      service.issue(user, 'verify_email', secondIssueAt),
    ).rejects.toMatchObject({ reason: 'RESEND_TOO_SOON' });
    expect(fakeCodeSender.sent).toHaveLength(1);
  });

  it('keeps the code row and reports codeSent: false when the sender throws (AUTH-13)', async () => {
    const user = buildUser('negar-sender-fails@example.com');
    const now = new Date('2026-01-01T00:00:00.000Z');
    fakeCodeSender.shouldThrow = true;

    const result = await service.issue(user, 'verify_email', now);

    expect(result.codeSent).toBe(false);
    const row = await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: user.id, purpose: 'verify_email' })
      .first();
    expect(row).toBeDefined();
  });
});
