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
class ResendCodeProbeResolver {
  @Query(() => Boolean)
  resendCodeProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [ResendCodeProbeResolver] })
class ResendCodeProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      email
    }
  }
`;

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
    }
  }
`;

const RESEND_CODE_MUTATION = `
  mutation ResendCode($input: ResendCodeInput!) {
    resendCode(input: $input) {
      codeSent
      resendAvailableAt
    }
  }
`;

const REQUEST_RESET_MUTATION = `
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) {
      codeSent
      resendAvailableAt
    }
  }
`;

const CONFIRM_CODE_MUTATION = `
  mutation ConfirmPasswordResetCode($input: ConfirmPasswordResetCodeInput!) {
    confirmPasswordResetCode(input: $input) {
      resetToken
      expiresAt
    }
  }
`;

describe('ResendCode (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, ResendCodeProbeModule],
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
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
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

  const signUp = (email: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: SIGN_UP_MUTATION,
        variables: {
          input: {
            firstName: 'Negar',
            lastName: 'Khosravi',
            email,
            password: 'correct-horse',
          },
        },
      });

  const verifyEmail = (email: string, code: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: { input: { email, code, rememberMe: false } },
      });

  const resendCode = (email: string, purpose = 'VERIFY_EMAIL') =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: RESEND_CODE_MUTATION,
        variables: { input: { email, purpose } },
      });

  const requestPasswordReset = (email: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: REQUEST_RESET_MUTATION,
        variables: { input: { email } },
      });

  const confirmPasswordResetCode = (email: string, code: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: CONFIRM_CODE_MUTATION,
        variables: { input: { email, code } },
      });

  it('sends a new code once the original is 61s old; the old code is refused and the new one works (AUTH-26)', async () => {
    const email = `negar-resend-61-${randomUUID()}@example.com`;
    await signUp(email);
    const oldCode = fakeCodeSender.sent[0].code;

    // Age the code by 61s so the resolver's `new Date()` sees it as past
    // cooldown without a real sleep.
    await testDbClient(Tables.IdentityVerificationCode)
      .where({})
      .update({
        createdAt: new Date(Date.now() - 61_000),
      });

    const response = await resendCode(email);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.resendCode.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(2);
    const newCode = fakeCodeSender.sent[1].code;

    const oldAttempt = await verifyEmail(email, oldCode);
    expect(oldAttempt.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );

    const newAttempt = await verifyEmail(email, newCode);
    expect(newAttempt.body.errors).toBeUndefined();
  });

  it('answers RESEND_TOO_SOON at 30s and sends nothing (AUTH-27)', async () => {
    const email = `negar-resend-30-${randomUUID()}@example.com`;
    await signUp(email);

    await testDbClient(Tables.IdentityVerificationCode)
      .where({})
      .update({
        createdAt: new Date(Date.now() - 30_000),
      });

    const response = await resendCode(email);
    expect(response.body.errors[0].extensions.originalError.reason).toBe(
      'RESEND_TOO_SOON',
    );
    expect(fakeCodeSender.sent).toHaveLength(1);
  });

  it('sends nothing and still reports codeSent: true for an unknown email', async () => {
    const response = await resendCode(
      `negar-unknown-${randomUUID()}@example.com`,
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.resendCode.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(0);
  });

  // The actual bug (Gap 1): the web used to send the purpose as a bare,
  // hyphenated string ("verify-email"/"reset-password") that the schema
  // didn't validate. A GraphQL enum must now reject anything that isn't
  // VERIFY_EMAIL/RESET_PASSWORD before the resolver (and no code row) is
  // ever reached.
  it('rejects a purpose value outside the enum and inserts no code row', async () => {
    const email = `negar-bad-purpose-${randomUUID()}@example.com`;
    await signUp(email);
    fakeCodeSender.reset();

    const response = await resendCode(email, 'verify-email');

    expect(response.body.errors).toBeDefined();
    expect(fakeCodeSender.sent).toHaveLength(0);
    const rows = await testDbClient(Tables.IdentityVerificationCode).where({
      purpose: 'verify_email',
    });
    expect(rows).toHaveLength(1);
  });

  it('resends a reset_password code via the RESET_PASSWORD enum value; the new code works and the original is refused (AUTH-60)', async () => {
    const email = `negar-resend-reset-${randomUUID()}@example.com`;
    await signUp(email);
    const verifyCode = fakeCodeSender.sent[0].code;
    await verifyEmail(email, verifyCode);
    fakeCodeSender.reset();

    await requestPasswordReset(email);
    const oldCode = fakeCodeSender.sent[0].code;

    await testDbClient(Tables.IdentityVerificationCode)
      .where({ purpose: 'reset_password' })
      .update({ createdAt: new Date(Date.now() - 61_000) });

    const response = await resendCode(email, 'RESET_PASSWORD');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.resendCode.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(2);
    const newCode = fakeCodeSender.sent[1].code;

    const oldAttempt = await confirmPasswordResetCode(email, oldCode);
    expect(oldAttempt.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );

    const newAttempt = await confirmPasswordResetCode(email, newCode);
    expect(newAttempt.body.errors).toBeUndefined();
    expect(
      newAttempt.body.data.confirmPasswordResetCode.resetToken,
    ).toBeDefined();
  });

  it('allows an immediate resend after a failed send, since nothing was ever delivered (AUTH-13 x AUTH-27)', async () => {
    const email = `negar-dead-code-resend-${randomUUID()}@example.com`;
    fakeCodeSender.shouldThrow = true;
    await signUp(email);
    // Signup's own code never reached an inbox.
    expect(fakeCodeSender.sent).toHaveLength(0);

    fakeCodeSender.shouldThrow = false;
    // No aging: a live, delivered code would still be inside its 60s
    // cooldown here. A dead (never-sent) code must not block a resend.
    const response = await resendCode(email);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.resendCode.codeSent).toBe(true);
    expect(fakeCodeSender.sent).toHaveLength(1);

    const newCode = fakeCodeSender.sent[0].code;
    const verifyAttempt = await verifyEmail(email, newCode);
    expect(verifyAttempt.body.errors).toBeUndefined();
  });
});
