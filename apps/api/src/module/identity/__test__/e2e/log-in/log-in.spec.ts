import { randomUUID } from 'crypto';
import {
  INestApplication,
  Injectable,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  CodeSender,
  SendCodeInput,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import { IdentityModule } from '@identityModule/identity.module';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

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
// builder; IdentityModule only has mutations so far.
@Resolver()
class LogInProbeResolver {
  @Query(() => Boolean)
  logInProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [LogInProbeResolver] })
class LogInProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) { email }
  }
`;

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) { accessToken }
  }
`;

const LOG_IN_MUTATION = `
  mutation LogIn($input: LogInInput!) {
    logIn(input: $input) {
      status
      codeSent
      resendAvailableAt
      session {
        accessToken
        refreshToken
        persistent
      }
    }
  }
`;

describe('LogIn (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, LogInProbeModule],
    })
      .overrideProvider(CodeSender)
      .useClass(FakeCodeSender)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    fakeCodeSender = module.get<FakeCodeSender>(CodeSender);
  }, 30000);

  beforeEach(async () => {
    fakeCodeSender.reset();
    await testDbClient(Tables.IdentityLoginThrottle).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityLoginThrottle).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    const identityDs = module.get<DataSource>(getDataSourceToken('identity'));
    if (identityDs.isInitialized) {
      await identityDs.destroy();
    }
    const profileDs = module.get<DataSource>(
      getDataSourceToken('user-profile'),
    );
    if (profileDs.isInitialized) {
      await profileDs.destroy();
    }
    await app.getHttpServer().close();
  });

  const PASSWORD = 'correct-horse';

  const signUpAndVerify = async (email: string) => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: SIGN_UP_MUTATION,
        variables: {
          input: {
            firstName: 'Negar',
            lastName: 'Khosravi',
            email,
            password: PASSWORD,
          },
        },
      });
    const code = fakeCodeSender.sent[fakeCodeSender.sent.length - 1].code;
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: { input: { email, code, rememberMe: false } },
      });
  };

  const signUpUnverified = (email: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: SIGN_UP_MUTATION,
        variables: {
          input: {
            firstName: 'Negar',
            lastName: 'Khosravi',
            email,
            password: PASSWORD,
          },
        },
      });

  const logIn = (email: string, password: string, rememberMe = false) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: LOG_IN_MUTATION,
        variables: { input: { email, password, rememberMe } },
      });

  it('signs in a verified user with the right password (AUTH-31)', async () => {
    const email = `negar-login-${randomUUID()}@example.com`;
    await signUpAndVerify(email);

    const response = await logIn(email, PASSWORD, true);

    expect(response.body.errors).toBeUndefined();
    const result = response.body.data.logIn;
    expect(result.status).toBe('SIGNED_IN');
    expect(result.session.accessToken).toBeDefined();
    expect(result.session.persistent).toBe(true);

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow.lastLoginAt).not.toBeNull();
  });

  it('matches an email in another casing with surrounding whitespace (AUTH-32)', async () => {
    const email = `negar-case-${randomUUID()}@example.com`;
    await signUpAndVerify(email);

    const response = await logIn(`  ${email.toUpperCase()} `, PASSWORD);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.logIn.status).toBe('SIGNED_IN');
  });

  it('refuses a wrong password and an unknown email with the same message, no session created (AUTH-33)', async () => {
    const email = `negar-wrongpw-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    const sessionsBefore = await testDbClient(Tables.IdentitySession);

    const wrongPassword = await logIn(email, 'not-the-password');
    expect(wrongPassword.body.errors[0].extensions.originalError).toEqual(
      expect.objectContaining({
        reason: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      }),
    );

    const unknownEmail = await logIn(
      `negar-ghost-${randomUUID()}@example.com`,
      PASSWORD,
    );
    expect(unknownEmail.body.errors[0].extensions.originalError).toEqual(
      expect.objectContaining({
        reason: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      }),
    );

    const sessionsAfter = await testDbClient(Tables.IdentitySession);
    expect(sessionsAfter).toHaveLength(sessionsBefore.length);
  });

  it('requires verification for an unverified user with the right password, sending one new code (AUTH-34)', async () => {
    const email = `negar-unverified-${randomUUID()}@example.com`;
    await signUpUnverified(email);
    const sentBefore = fakeCodeSender.sent.length;
    // Age the signup code past the 60s resend cooldown so logIn's own code
    // issue isn't blocked by RESEND_TOO_SOON.
    await testDbClient(Tables.IdentityVerificationCode)
      .where({})
      .update({ createdAt: new Date(Date.now() - 61_000) });

    const response = await logIn(email, PASSWORD);

    expect(response.body.errors).toBeUndefined();
    const result = response.body.data.logIn;
    expect(result.status).toBe('VERIFICATION_REQUIRED');
    expect(result.session).toBeNull();
    expect(fakeCodeSender.sent.length).toBe(sentBefore + 1);
  });

  it('reuses a still-live code instead of erroring when logging in inside the 60s cooldown (AUTH-34 x AUTH-27)', async () => {
    const email = `negar-pending-${randomUUID()}@example.com`;
    await signUpUnverified(email);
    const sentBefore = fakeCodeSender.sent.length;
    const originalCode =
      fakeCodeSender.sent[fakeCodeSender.sent.length - 1].code;
    const originalRow = await testDbClient(Tables.IdentityVerificationCode)
      .where({})
      .first();

    // No aging here: the signup code is still well within the 60s cooldown,
    // so a plain `issue` call would throw RESEND_TOO_SOON. logIn must not
    // surface that as an error.
    const response = await logIn(email, PASSWORD);

    expect(response.body.errors).toBeUndefined();
    const result = response.body.data.logIn;
    expect(result.status).toBe('VERIFICATION_REQUIRED');
    expect(result.session).toBeNull();
    expect(result.codeSent).toBe(true);
    // The resend window is relative to when the code was actually sent, not
    // to now and not to the code's original createdAt: reuse must not reset
    // or drift the cooldown the web uses to enable "Resend".
    expect(new Date(result.resendAvailableAt).getTime()).toBe(
      new Date(originalRow.createdAt).getTime() + 60_000,
    );
    // No second code was dispatched: the original is reused as-is.
    expect(fakeCodeSender.sent.length).toBe(sentBefore);

    const verifyAttempt = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: {
          input: { email, code: originalCode, rememberMe: false },
        },
      });
    expect(verifyAttempt.body.errors).toBeUndefined();
    expect(verifyAttempt.body.data.verifyEmail.accessToken).toBeDefined();
  });

  it("keeps the reused code's attempt count and expiry exactly as they were, instead of resetting them (AUTH-34 x AUTH-23)", async () => {
    const email = `negar-reuse-attempts-${randomUUID()}@example.com`;
    await signUpUnverified(email);
    const originalCode =
      fakeCodeSender.sent[fakeCodeSender.sent.length - 1].code;
    const wrongCode =
      originalCode.slice(0, -1) + (originalCode.slice(-1) === '0' ? '1' : '0');

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();

    for (let i = 0; i < 2; i += 1) {
      const attempt = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: VERIFY_EMAIL_MUTATION,
          variables: {
            input: { email, code: wrongCode, rememberMe: false },
          },
        });
      expect(attempt.body.errors[0].extensions.originalError.reason).toBe(
        'CODE_INCORRECT',
      );
    }

    const beforeLogin = await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: userRow.id, purpose: 'verify_email' })
      .first();
    expect(beforeLogin.failedAttempts).toBe(2);

    // Within the 60s cooldown: this reuses the live code rather than
    // issuing a fresh one.
    const response = await logIn(email, PASSWORD);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.logIn.status).toBe('VERIFICATION_REQUIRED');

    const afterLogin = await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: userRow.id, purpose: 'verify_email' })
      .first();
    // A regression that resets failedAttempts or extends expiresAt on
    // reuse would let an attacker who knows the password but not the
    // inbox guess indefinitely: 4 wrong, log in, repeat.
    expect(afterLogin.failedAttempts).toBe(2);
    expect(new Date(afterLogin.expiresAt).getTime()).toBe(
      new Date(beforeLogin.expiresAt).getTime(),
    );
    expect(new Date(afterLogin.createdAt).getTime()).toBe(
      new Date(beforeLogin.createdAt).getTime(),
    );

    for (let i = 0; i < 3; i += 1) {
      const attempt = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: VERIFY_EMAIL_MUTATION,
          variables: {
            input: { email, code: wrongCode, rememberMe: false },
          },
        });
      expect(attempt.body.errors[0].extensions.originalError.reason).toBe(
        'CODE_INCORRECT',
      );
    }

    const finalAttempt = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: {
          input: { email, code: originalCode, rememberMe: false },
        },
      });
    expect(finalAttempt.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_ATTEMPTS_EXCEEDED',
    );
  });

  it('locks after 5 failures within 15 minutes and unlocks after the window (AUTH-35)', async () => {
    const email = `negar-lockout-${randomUUID()}@example.com`;
    await signUpAndVerify(email);

    for (let i = 0; i < 5; i += 1) {
      await logIn(email, 'wrong-password');
    }

    const locked = await logIn(email, PASSWORD);
    expect(locked.body.errors[0].extensions.originalError).toEqual(
      expect.objectContaining({
        reason: 'LOGIN_LOCKED',
        message: 'Too many attempts. Try again in 15 minutes.',
      }),
    );

    const email2 = `negar-4fail-${randomUUID()}@example.com`;
    await signUpAndVerify(email2);
    for (let i = 0; i < 4; i += 1) {
      await logIn(email2, 'wrong-password');
    }
    const succeedsAfter4 = await logIn(email2, PASSWORD);
    expect(succeedsAfter4.body.errors).toBeUndefined();

    const email3 = `negar-expired-lock-${randomUUID()}@example.com`;
    await signUpAndVerify(email3);
    for (let i = 0; i < 5; i += 1) {
      await logIn(email3, 'wrong-password');
    }
    await testDbClient(Tables.IdentityLoginThrottle)
      .where({ email: email3 })
      .update({ lockedUntil: new Date(Date.now() - (15 * 60_000 + 1000)) });
    const succeedsAfterWindow = await logIn(email3, PASSWORD);
    expect(succeedsAfterWindow.body.errors).toBeUndefined();

    const unknownEmail = `negar-unknown-lock-${randomUUID()}@example.com`;
    for (let i = 0; i < 5; i += 1) {
      await logIn(unknownEmail, 'wrong-password');
    }
    const unknownLocked = await logIn(unknownEmail, 'wrong-password');
    expect(unknownLocked.body.errors[0].extensions.originalError.reason).toBe(
      'LOGIN_LOCKED',
    );
  });

  it('does not lock after 3 failures, a success, then 4 more failures (AUTH-36)', async () => {
    const email = `negar-reset-window-${randomUUID()}@example.com`;
    await signUpAndVerify(email);

    for (let i = 0; i < 3; i += 1) {
      await logIn(email, 'wrong-password');
    }
    const success = await logIn(email, PASSWORD);
    expect(success.body.errors).toBeUndefined();

    for (let i = 0; i < 4; i += 1) {
      await logIn(email, 'wrong-password');
    }
    const stillOk = await logIn(email, PASSWORD);
    expect(stillOk.body.errors).toBeUndefined();
  });

  it('sends a real new code, rather than lying codeSent: true, when logging in after a failed send (AUTH-13 x AUTH-34)', async () => {
    const email = `negar-dead-code-${randomUUID()}@example.com`;
    fakeCodeSender.shouldThrow = true;
    await signUpUnverified(email);
    // Signup's own code never reached an inbox.
    expect(fakeCodeSender.sent).toHaveLength(0);

    fakeCodeSender.shouldThrow = false;
    // No aging: this is still inside what would be the dead code's 60s
    // cooldown. A dead (never-delivered) code must not be reused and must
    // not be reported as sent.
    const response = await logIn(email, PASSWORD);

    expect(response.body.errors).toBeUndefined();
    const result = response.body.data.logIn;
    expect(result.status).toBe('VERIFICATION_REQUIRED');
    expect(result.session).toBeNull();
    expect(result.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(1);

    const newCode = fakeCodeSender.sent[0].code;
    const verifyAttempt = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: { input: { email, code: newCode, rememberMe: false } },
      });
    expect(verifyAttempt.body.errors).toBeUndefined();
    expect(verifyAttempt.body.data.verifyEmail.accessToken).toBeDefined();
  });
});
