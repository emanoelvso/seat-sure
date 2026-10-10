import { randomUUID } from 'crypto';
import {
  INestApplication,
  Injectable,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
// builder; IdentityModule only has mutations of its own plus `me`.
@Resolver()
class SessionProbeResolver {
  @Query(() => Boolean)
  sessionProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [SessionProbeResolver] })
class SessionProbeModule {}

const SIGN_UP_MUTATION = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) { email }
  }
`;

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

const REFRESH_SESSION_MUTATION = `
  mutation RefreshSession($input: RefreshSessionInput!) {
    refreshSession(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      id
      email
      firstName
      lastName
      avatarUrl
    }
  }
`;

describe('Session (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let fakeCodeSender: FakeCodeSender;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [GraphqlModule, IdentityModule, SessionProbeModule],
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
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: VERIFY_EMAIL_MUTATION,
        variables: { input: { email, code, rememberMe: false } },
      });
    return response.body.data.verifyEmail as {
      accessToken: string;
      refreshToken: string;
    };
  };

  const refreshSession = (refreshToken: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: REFRESH_SESSION_MUTATION,
        variables: { input: { refreshToken } },
      });

  const me = (accessToken?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (accessToken) {
      req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req.send({ query: ME_QUERY });
  };

  it('returns a new access token and a different refresh token, which itself keeps working (AUTH-47)', async () => {
    const email = `negar-refresh-${randomUUID()}@example.com`;
    const { refreshToken } = await signUpAndVerify(email);

    const first = await refreshSession(refreshToken);
    expect(first.body.errors).toBeUndefined();
    const firstResult = first.body.data.refreshSession;
    expect(firstResult.refreshToken).toBeDefined();
    expect(firstResult.refreshToken).not.toBe(refreshToken);

    const second = await refreshSession(firstResult.refreshToken);
    expect(second.body.errors).toBeUndefined();
  });

  it('accepts the replaced token within 30s (new access token, refreshToken: null) but not after (AUTH-47)', async () => {
    const email = `negar-grace-${randomUUID()}@example.com`;
    const { refreshToken } = await signUpAndVerify(email);

    const rotated = await refreshSession(refreshToken);
    const oldToken = refreshToken;

    const withinGrace = await refreshSession(oldToken);
    expect(withinGrace.body.errors).toBeUndefined();
    expect(withinGrace.body.data.refreshSession.accessToken).toBeDefined();
    expect(withinGrace.body.data.refreshSession.refreshToken).toBeNull();

    // Push the rotation outside the 30s grace window.
    const sessionRow = await testDbClient(Tables.IdentitySession).first();
    await testDbClient(Tables.IdentitySession)
      .where({ id: sessionRow.id })
      .update({ rotatedAt: new Date(Date.now() - 31_000) });

    const afterGrace = await refreshSession(oldToken);
    expect(afterGrace.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(rotated.body.errors).toBeUndefined();
  });

  it('rejects refresh after expiresAt has passed, or when the session is revoked (AUTH-48)', async () => {
    const expiredEmail = `negar-expired-session-${randomUUID()}@example.com`;
    const expired = await signUpAndVerify(expiredEmail);
    await testDbClient(Tables.IdentitySession)
      .where({})
      .update({ expiresAt: new Date(Date.now() - 1000) });
    const expiredResponse = await refreshSession(expired.refreshToken);
    expect(expiredResponse.body.errors[0].extensions.code).toBe(
      'UNAUTHENTICATED',
    );

    await testDbClient(Tables.IdentitySession).del();

    const revokedEmail = `negar-revoked-session-${randomUUID()}@example.com`;
    const revoked = await signUpAndVerify(revokedEmail);
    await testDbClient(Tables.IdentitySession)
      .where({})
      .update({ revokedAt: new Date() });
    const revokedResponse = await refreshSession(revoked.refreshToken);
    expect(revokedResponse.body.errors[0].extensions.code).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('returns the current user for a fresh access token (AUTH-49)', async () => {
    const email = `negar-me-${randomUUID()}@example.com`;
    const { accessToken } = await signUpAndVerify(email);

    const response = await me(accessToken);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.me).toEqual({
      id: expect.any(String),
      email,
      firstName: 'Negar',
      lastName: 'Khosravi',
      avatarUrl: null,
    });
  });

  it('rejects me without a header, with a token signed by another secret, or after revocation (AUTH-48, AUTH-50)', async () => {
    const withoutHeader = await me();
    expect(withoutHeader.body.errors[0].extensions.code).toBe(
      'UNAUTHENTICATED',
    );

    const foreignToken = jwtService.sign(
      {
        sub: randomUUID(),
        sid: randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 900,
      },
      { secret: 'a'.repeat(32) },
    );
    const wrongSecret = await me(foreignToken);
    expect(wrongSecret.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');

    const email = `negar-revoke-me-${randomUUID()}@example.com`;
    const { accessToken } = await signUpAndVerify(email);
    await testDbClient(Tables.IdentitySession)
      .where({})
      .update({ revokedAt: new Date() });
    const afterRevoke = await me(accessToken);
    expect(afterRevoke.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('returns empty names for a user whose profile is missing', async () => {
    const email = `negar-no-profile-${randomUUID()}@example.com`;
    const { accessToken } = await signUpAndVerify(email);
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient(Tables.NotificationsNotification).del();

    const response = await me(accessToken);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.me.firstName).toBe('');
    expect(response.body.data.me.lastName).toBe('');
  });
});
