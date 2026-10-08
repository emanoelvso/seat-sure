import { createHash, randomUUID } from 'crypto';
import {
  INestApplication,
  Injectable,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
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
// builder; IdentityModule only has mutations so far.
@Resolver()
class VerifyEmailProbeResolver {
  @Query(() => Boolean)
  verifyEmailProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [VerifyEmailProbeResolver] })
class VerifyEmailProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      email
      codeSent
    }
  }
`;

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
      refreshToken
      expiresAt
      persistent
    }
  }
`;

describe('VerifyEmail (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, VerifyEmailProbeModule],
    })
      .overrideProvider(CodeSender)
      .useClass(FakeCodeSender)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    fakeCodeSender = module.get<FakeCodeSender>(CodeSender);
    jwtService = module.get(JwtService);
  }, 30000);

  beforeEach(async () => {
    fakeCodeSender.reset();
    await testDbClient(Tables.IdentitySession).del();
    await testDbClient(Tables.IdentityVerificationCode).del();
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient(Tables.NotificationsNotification).del();
  });

  afterAll(async () => {
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

  const verifyEmail = (input: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query: VERIFY_EMAIL_MUTATION, variables: { input } });

  it('sets emailVerifiedAt and starts a session on the right code (AUTH-20)', async () => {
    const email = `negar-verify-${randomUUID()}@example.com`;
    await signUp(email);
    const code = fakeCodeSender.sent[0].code;

    const response = await verifyEmail({ email, code, rememberMe: false });

    expect(response.body.errors).toBeUndefined();
    const result = response.body.data.verifyEmail;

    const userRow = await testDbClient(Tables.IdentityUser)
      .where({ email })
      .first();
    expect(userRow.emailVerifiedAt).not.toBeNull();

    const decoded = jwtService.decode(result.accessToken) as {
      sub: string;
      sid: string;
      iat: number;
      exp: number;
    };
    expect(decoded.sub).toBe(userRow.id);

    const sessionRow = await testDbClient(Tables.IdentitySession)
      .where({ id: decoded.sid })
      .first();
    expect(sessionRow).toBeDefined();

    const refreshHash = createHash('sha256')
      .update(result.refreshToken)
      .digest('hex');
    expect(sessionRow.refreshTokenHash).toBe(refreshHash);
    expect(result.persistent).toBe(false);
    expect(sessionRow.persistent).toBe(false);
    expect(decoded.exp - decoded.iat).toBe(900);
  });

  it('sets a 30-day session for rememberMe: true and 24h for false (AUTH-45, AUTH-46)', async () => {
    const persistentEmail = `negar-30d-${randomUUID()}@example.com`;
    await signUp(persistentEmail);
    const persistentCode = fakeCodeSender.sent[0].code;
    const persistentResponse = await verifyEmail({
      email: persistentEmail,
      code: persistentCode,
      rememberMe: true,
    });
    const persistentExpiresAt = new Date(
      persistentResponse.body.data.verifyEmail.expiresAt,
    ).getTime();
    const now = Date.now();
    expect(
      Math.abs(persistentExpiresAt - (now + 30 * 24 * 60 * 60 * 1000)),
    ).toBeLessThan(5000);

    const sessionEmail = `negar-24h-${randomUUID()}@example.com`;
    await signUp(sessionEmail);
    const sessionCode = fakeCodeSender.sent[1].code;
    const sessionResponse = await verifyEmail({
      email: sessionEmail,
      code: sessionCode,
      rememberMe: false,
    });
    const sessionExpiresAt = new Date(
      sessionResponse.body.data.verifyEmail.expiresAt,
    ).getTime();
    expect(
      Math.abs(sessionExpiresAt - (now + 24 * 60 * 60 * 1000)),
    ).toBeLessThan(5000);
  });

  it('rejects a wrong code without creating a session, and refuses reuse (AUTH-24)', async () => {
    const email = `negar-wrong-${randomUUID()}@example.com`;
    await signUp(email);
    const code = fakeCodeSender.sent[0].code;
    const wrongCode = code.slice(0, -1) + (code.slice(-1) === '0' ? '1' : '0');

    const wrong = await verifyEmail({
      email,
      code: wrongCode,
      rememberMe: false,
    });
    expect(wrong.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
    const sessionsAfterWrong = await testDbClient(Tables.IdentitySession);
    expect(sessionsAfterWrong).toHaveLength(0);

    const right = await verifyEmail({ email, code, rememberMe: false });
    expect(right.body.errors).toBeUndefined();

    const reused = await verifyEmail({ email, code, rememberMe: false });
    expect(reused.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
  });

  // The sequential test above proves `consumedAt` is checked once a code
  // is already marked consumed, but that alone passes even if the
  // repository's conditional `UPDATE ... WHERE consumedAt IS NULL` guard is
  // removed, because nothing ever races the two reads. Firing two
  // concurrent attempts with the SAME right code is the only way to prove
  // the single-use guarantee holds under a race, not just sequentially.
  it('consumes a code exactly once under concurrent verifyEmail calls (AUTH-24)', async () => {
    const email = `negar-concurrent-${randomUUID()}@example.com`;
    await signUp(email);
    const code = fakeCodeSender.sent[0].code;

    const [first, second] = await Promise.all([
      verifyEmail({ email, code, rememberMe: false }),
      verifyEmail({ email, code, rememberMe: false }),
    ]);

    const results = [first, second];
    const succeeded = results.filter((r) => r.body.errors === undefined);
    const failed = results.filter((r) => r.body.errors !== undefined);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );

    const sessions = await testDbClient(Tables.IdentitySession).where({});
    expect(sessions).toHaveLength(1);
  });

  it('rejects an unknown email with CODE_INCORRECT', async () => {
    const response = await verifyEmail({
      email: `negar-unknown-${randomUUID()}@example.com`,
      code: '123456',
      rememberMe: false,
    });

    expect(response.body.errors[0].extensions.originalError.reason).toBe(
      'CODE_INCORRECT',
    );
  });
});
