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
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

@Injectable()
class FakeCodeSender implements CodeSender {
  sent: SendCodeInput[] = [];

  async send(input: SendCodeInput): Promise<void> {
    this.sent.push(input);
  }

  reset(): void {
    this.sent = [];
  }
}

// A trivial Query root is required by Nest's code-first GraphQL schema
// builder; IdentityModule only has mutations plus `me`.
@Resolver()
class AuthLoggingProbeResolver {
  @Query(() => Boolean)
  authLoggingProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [AuthLoggingProbeResolver] })
class AuthLoggingProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) { email }
  }
`;

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) { accessToken refreshToken }
  }
`;

const LOG_IN_MUTATION = `
  mutation LogIn($input: LogInInput!) {
    logIn(input: $input) { status session { accessToken refreshToken } }
  }
`;

const REQUEST_RESET_MUTATION = `
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) { codeSent }
  }
`;

const CONFIRM_CODE_MUTATION = `
  mutation ConfirmPasswordResetCode($input: ConfirmPasswordResetCodeInput!) {
    confirmPasswordResetCode(input: $input) { resetToken }
  }
`;

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

const REFRESH_SESSION_MUTATION = `
  mutation RefreshSession($input: RefreshSessionInput!) {
    refreshSession(input: $input) { accessToken refreshToken }
  }
`;

describe('Auth event logging (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, AuthLoggingProbeModule],
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
    logSpy = jest.spyOn(AppLogger.prototype, 'log');
    warnSpy = jest.spyOn(AppLogger.prototype, 'warn');
    errorSpy = jest.spyOn(AppLogger.prototype, 'error');
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
    await testDbClient(Tables.IdentityLoginThrottle).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
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

  const post = (query: string, variables: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/graphql').send({ query, variables });

  const signUp = (email: string, password: string) =>
    post(SIGN_UP_MUTATION, {
      input: { firstName: 'Negar', lastName: 'Khosravi', email, password },
    });

  const verifyEmail = (email: string, code: string) =>
    post(VERIFY_EMAIL_MUTATION, {
      input: { email, code, rememberMe: false },
    });

  const logIn = (email: string, password: string) =>
    post(LOG_IN_MUTATION, { input: { email, password, rememberMe: false } });

  const allCalls = () => [
    ...logSpy.mock.calls,
    ...warnSpy.mock.calls,
    ...errorSpy.mock.calls,
  ];

  const callsNamed = (event: string) =>
    allCalls().filter(([message]) => message === event);

  it('logs each of the six events once, with the user id or normalized email (AUTH-54)', async () => {
    const email = `negar-logging-${randomUUID()}@example.com`;
    const originalPassword = 'correct-horse';
    const newPassword = 'new-password-123';

    await signUp(email, originalPassword);
    const signUpCode = fakeCodeSender.sent[0].code;

    await verifyEmail(email, signUpCode);

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();

    await logIn(email, originalPassword);
    await logIn(email, 'wrong-password');

    for (let i = 0; i < 4; i += 1) {
      await logIn(email, 'wrong-password');
    }
    await logIn(email, originalPassword);

    fakeCodeSender.reset();
    await testDbClient(Tables.IdentityVerificationCode)
      .where({ userId: userRow.id })
      .update({ createdAt: new Date(Date.now() - 61_000) });
    await post(REQUEST_RESET_MUTATION, { input: { email } });
    const resetCode = fakeCodeSender.sent[0].code;
    const confirmResponse = await post(CONFIRM_CODE_MUTATION, {
      input: { email, code: resetCode },
    });
    const resetToken =
      confirmResponse.body.data.confirmPasswordResetCode.resetToken;
    await post(RESET_PASSWORD_MUTATION, {
      input: { resetToken, newPassword },
    });

    const unknownEmail = `negar-ghost-${randomUUID()}@example.com`;
    await logIn(unknownEmail, 'whatever');

    expect(callsNamed('signup')).toHaveLength(1);
    expect(callsNamed('signup')[0][1]).toMatchObject({ userId: userRow.id });

    expect(callsNamed('email-verified')).toHaveLength(1);
    expect(callsNamed('email-verified')[0][1]).toMatchObject({
      userId: userRow.id,
    });

    expect(callsNamed('login-succeeded').length).toBeGreaterThanOrEqual(1);
    expect(callsNamed('login-succeeded')[0][1]).toMatchObject({
      userId: userRow.id,
    });

    expect(callsNamed('login-failed').length).toBeGreaterThanOrEqual(1);
    const unknownEmailFailure = callsNamed('login-failed').find(
      ([, context]) => (context as { email?: string }).email === unknownEmail,
    );
    expect(unknownEmailFailure).toBeDefined();

    expect(callsNamed('login-locked')).toHaveLength(1);

    expect(callsNamed('password-reset')).toHaveLength(1);
    expect(callsNamed('password-reset')[0][1]).toMatchObject({
      userId: userRow.id,
    });
  });

  it('never logs a password, hash, token, or code across a full run (AUTH-55)', async () => {
    const email = `negar-secrets-${randomUUID()}@example.com`;
    const originalPassword = 'super-secret-pw!';
    const newPassword = 'another-secret-pw!';

    await signUp(email, originalPassword);
    const signUpCode = fakeCodeSender.sent[0].code;

    const verifyResponse = await verifyEmail(email, signUpCode);
    const { accessToken, refreshToken } = verifyResponse.body.data.verifyEmail;

    await logIn(email, originalPassword);
    await logIn(email, 'wrong-password');

    fakeCodeSender.reset();
    await testDbClient(Tables.IdentityVerificationCode)
      .where({})
      .update({ createdAt: new Date(Date.now() - 61_000) });
    await post(REQUEST_RESET_MUTATION, { input: { email } });
    const resetCode = fakeCodeSender.sent[0].code;
    const confirmResponse = await post(CONFIRM_CODE_MUTATION, {
      input: { email, code: resetCode },
    });
    const resetToken =
      confirmResponse.body.data.confirmPasswordResetCode.resetToken;
    await post(RESET_PASSWORD_MUTATION, {
      input: { resetToken, newPassword },
    });

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();

    const refreshResponse = await post(REFRESH_SESSION_MUTATION, {
      input: { refreshToken },
    });

    const serializedLogs = JSON.stringify(allCalls());

    for (const secret of [
      originalPassword,
      newPassword,
      userRow.passwordHash,
      accessToken,
      refreshToken,
      refreshResponse.body.data?.refreshSession?.accessToken,
      refreshResponse.body.data?.refreshSession?.refreshToken,
      resetToken,
      signUpCode,
      resetCode,
    ]) {
      if (secret) {
        expect(serializedLogs).not.toContain(secret);
      }
    }
  });
});
