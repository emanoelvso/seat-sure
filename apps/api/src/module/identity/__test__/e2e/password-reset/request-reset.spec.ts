import { createHash, randomUUID } from 'crypto';
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
class RequestResetProbeResolver {
  @Query(() => Boolean)
  requestResetProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [RequestResetProbeResolver] })
class RequestResetProbeModule {}

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

describe('RequestPasswordReset (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, RequestResetProbeModule],
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
    await testDbClient(Tables.NotificationsNotification).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityPasswordResetGrant).del();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient(Tables.NotificationsNotification).del();
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
    const notificationsDs = module.get<DataSource>(
      getDataSourceToken('notifications'),
    );
    if (notificationsDs.isInitialized) {
      await notificationsDs.destroy();
    }
    await app.getHttpServer().close();
  });

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
            password: 'correct-horse',
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

  const requestReset = (email: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: REQUEST_RESET_MUTATION,
        variables: { input: { email } },
      });

  const confirmCode = (email: string, code: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: CONFIRM_CODE_MUTATION,
        variables: { input: { email, code } },
      });

  it('sends one reset-password code for an existing account in another casing (AUTH-57)', async () => {
    const email = `negar-reset-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    fakeCodeSender.reset();

    const response = await requestReset(email.toUpperCase());

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.requestPasswordReset.codeSent).toBe(true);
    expect(
      response.body.data.requestPasswordReset.resendAvailableAt,
    ).toBeDefined();
    expect(fakeCodeSender.sent).toHaveLength(1);
    expect(fakeCodeSender.sent[0].purpose).toBe('reset_password');
  });

  it('answers the same shape and sends nothing for an unknown email (AUTH-58)', async () => {
    const email = `negar-unknown-${randomUUID()}@example.com`;

    const response = await requestReset(email);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.requestPasswordReset.codeSent).toBe(true);
    expect(
      response.body.data.requestPasswordReset.resendAvailableAt,
    ).toBeDefined();
    expect(fakeCodeSender.sent).toHaveLength(0);
    const codeRows = await testDbClient(Tables.IdentityVerificationCode);
    expect(codeRows).toHaveLength(0);
  });

  it('issues a reset grant whose hash matches the token, expiring in 10 minutes (AUTH-60)', async () => {
    const email = `negar-confirm-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    fakeCodeSender.reset();
    await requestReset(email);
    const code = fakeCodeSender.sent[0].code;

    const response = await confirmCode(email, code);

    expect(response.body.errors).toBeUndefined();
    const { resetToken, expiresAt } =
      response.body.data.confirmPasswordResetCode;
    expect(resetToken).toBeDefined();

    const grantRow = await testDbClient(
      Tables.IdentityPasswordResetGrant,
    ).first();
    expect(grantRow.tokenHash).toBe(
      createHash('sha256').update(resetToken).digest('hex'),
    );
    expect(new Date(grantRow.expiresAt).getTime()).toBe(
      new Date(expiresAt).getTime(),
    );
  });

  it('does not confirm a reset with a verify_email code (AUTH-60)', async () => {
    const email = `negar-wrong-purpose-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    await requestReset(email);

    // The signup's verify_email code, not the reset_password one.
    const verifyEmailCode = fakeCodeSender.sent.find(
      (s) => s.purpose === 'verify_email',
    )!.code;

    const response = await confirmCode(email, verifyEmailCode);

    expect(response.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
  });

  it('rejects any code for an unknown email with CODE_INCORRECT', async () => {
    const response = await confirmCode(
      `negar-ghost-${randomUUID()}@example.com`,
      '123456',
    );

    expect(response.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
  });

  it('rejects a wrong reset-password code with CODE_INCORRECT', async () => {
    const email = `negar-wrong-code-${randomUUID()}@example.com`;
    await signUpAndVerify(email);
    fakeCodeSender.reset();
    await requestReset(email);
    const code = fakeCodeSender.sent[0].code;
    const wrongCode = code.slice(0, -1) + (code.slice(-1) === '0' ? '1' : '0');

    const response = await confirmCode(email, wrongCode);

    expect(response.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
  });
});
