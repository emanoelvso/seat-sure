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
class ResetPasswordProbeResolver {
  @Query(() => Boolean)
  resetPasswordProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [ResetPasswordProbeResolver] })
class ResetPasswordProbeModule {}

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
    logIn(input: $input) { status }
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

describe('ResetPassword (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, ResetPasswordProbeModule],
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
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
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

  const ORIGINAL_PASSWORD = 'correct-horse';

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
            password: ORIGINAL_PASSWORD,
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
            password: ORIGINAL_PASSWORD,
          },
        },
      });

  const logIn = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: LOG_IN_MUTATION,
        variables: { input: { email, password, rememberMe: false } },
      });

  const getResetToken = async (email: string) => {
    fakeCodeSender.reset();
    // Age any previous code for this email past the 60s resend cooldown so
    // a second reset request in the same test isn't blocked by it.
    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    if (userRow) {
      await testDbClient(Tables.IdentityVerificationCode)
        .where({ userId: userRow.id })
        .update({ createdAt: new Date(Date.now() - 61_000) });
    }
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: REQUEST_RESET_MUTATION,
        variables: { input: { email } },
      });
    const code = fakeCodeSender.sent[0].code;
    const confirmResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: CONFIRM_CODE_MUTATION,
        variables: { input: { email, code } },
      });
    return confirmResponse.body.data.confirmPasswordResetCode
      .resetToken as string;
  };

  const resetPassword = (resetToken: string, newPassword: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: RESET_PASSWORD_MUTATION,
        variables: { input: { resetToken, newPassword } },
      });

  it('makes the old password fail and the new one succeed (AUTH-64)', async () => {
    const email = `negar-reset-pw-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    const resetToken = await getResetToken(email);

    const response = await resetPassword(resetToken, 'new-password-123');
    expect(response.body.errors).toBeUndefined();

    const oldPasswordAttempt = await logIn(email, ORIGINAL_PASSWORD);
    expect(
      oldPasswordAttempt.body.errors[0].extensions.originalError.reason,
    ).toBe('INVALID_CREDENTIALS');

    const newPasswordAttempt = await logIn(email, 'new-password-123');
    expect(newPasswordAttempt.body.errors).toBeUndefined();
    expect(newPasswordAttempt.body.data.logIn.status).toBe('SIGNED_IN');
  });

  it("revokes the user's existing sessions but not another user's (AUTH-65)", async () => {
    const email = `negar-revoke-sessions-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    // A second session for the same user (e.g. logged in on another device).
    await logIn(email, ORIGINAL_PASSWORD);

    const otherEmail = `negar-other-user-${randomUUID()}@example.com`;
    await signUpAndVerify(otherEmail);

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    const ownSessionsBefore = await testDbClient(Tables.IdentitySession).where({
      userId: userRow.id,
    });
    expect(ownSessionsBefore.length).toBeGreaterThanOrEqual(2);

    const resetToken = await getResetToken(email);
    await resetPassword(resetToken, 'new-password-123');

    const ownSessionsAfter = await testDbClient(Tables.IdentitySession).where({
      userId: userRow.id,
    });
    expect(
      ownSessionsAfter.every((s: { revokedAt: Date }) => s.revokedAt !== null),
    ).toBe(true);

    const otherUserRow = await testDbClient(Tables.IdentityUser)
      .where({ email: otherEmail })
      .first();
    const otherSessions = await testDbClient(Tables.IdentitySession).where({
      userId: otherUserRow.id,
    });
    expect(
      otherSessions.every(
        (s: { revokedAt: Date | null }) => s.revokedAt === null,
      ),
    ).toBe(true);
  });

  it('verifies the email for an unverified user and allows SIGNED_IN on the next login (AUTH-66)', async () => {
    const email = `negar-unverified-reset-${randomUUID()}@example.com`;
    await signUpUnverified(email);
    const resetToken = await getResetToken(email);

    await resetPassword(resetToken, 'new-password-123');

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow.emailVerifiedAt).not.toBeNull();

    const loginResponse = await logIn(email, 'new-password-123');
    expect(loginResponse.body.errors).toBeUndefined();
    expect(loginResponse.body.data.logIn.status).toBe('SIGNED_IN');
  });

  it('rejects a 7-char and a 73-char password, leaving the password unchanged; accepts 8 and 72 (AUTH-63)', async () => {
    const email = `negar-pw-length-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    const userRowBefore = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();

    const tooShortToken = await getResetToken(email);
    const tooShort = await resetPassword(tooShortToken, '1234567');
    expect(tooShort.body.errors[0].extensions.originalError.reason).toBe(
      'INVALID_INPUT',
    );

    const tooLongToken = await getResetToken(email);
    const tooLong = await resetPassword(tooLongToken, 'a'.repeat(73));
    expect(tooLong.body.errors[0].extensions.originalError.reason).toBe(
      'INVALID_INPUT',
    );

    const userRowAfter = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRowAfter.passwordHash).toBe(userRowBefore.passwordHash);

    const minToken = await getResetToken(email);
    const min = await resetPassword(minToken, '8'.repeat(8));
    expect(min.body.errors).toBeUndefined();

    const maxToken = await getResetToken(email);
    const max = await resetPassword(maxToken, 'a'.repeat(72));
    expect(max.body.errors).toBeUndefined();
  });

  it('rejects a grant used twice, and one that is 10 minutes and 1 second old (AUTH-68)', async () => {
    const usedEmail = `negar-used-grant-${randomUUID()}@example.com`;
    await signUpAndVerify(usedEmail);
    const usedToken = await getResetToken(usedEmail);
    await resetPassword(usedToken, 'new-password-123');
    const reused = await resetPassword(usedToken, 'another-password-456');
    expect(reused.body.errors[0].extensions.originalError.reason).toBe(
      'RESET_GRANT_INVALID',
    );

    const expiredEmail = `negar-expired-grant-${randomUUID()}@example.com`;
    await signUpAndVerify(expiredEmail);
    const expiredToken = await getResetToken(expiredEmail);
    const expiredUserRow = await testDbClient(Tables.IdentityUser)
      .where({ email: expiredEmail })
      .first();
    await testDbClient(Tables.IdentityPasswordResetGrant)
      .where({ userId: expiredUserRow.id })
      .update({ expiresAt: new Date(Date.now() - (10 * 60_000 + 1000)) });
    const expired = await resetPassword(expiredToken, 'new-password-123');
    expect(expired.body.errors[0].extensions.originalError.reason).toBe(
      'RESET_GRANT_INVALID',
    );
  });
});
