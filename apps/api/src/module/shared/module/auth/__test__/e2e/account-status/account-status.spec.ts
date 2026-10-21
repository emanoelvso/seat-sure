import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { IdentityModule } from '@identityModule/identity.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const MY_PAYMENT_CARDS = 'query { myPaymentCards { id } }';
const MY_PROFILE = 'query { myProfile { firstName } }';

// DEL-03 / PEND-02: a user with a pending or completed deletion loses the
// access token they already hold.
describe('AuthGuard with a deleted account (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const pendingUserId = randomUUID();
  const completedUserId = randomUUID();
  const otherUserId = randomUUID();

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([
      IdentityModule,
      BillingModule,
      UserProfileModule,
    ]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient(Tables.IdentityAccountDeletion).insert([
      {
        id: randomUUID(),
        userId: pendingUserId,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: completedUserId,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityAccountDeletion).del();
    await testDbClient.destroy();
    for (const name of ['identity', 'billing', 'user-profile']) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
    await app.getHttpServer().close();
  });

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const graphql = (query: string, token: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query });

  it.each([
    ['myPaymentCards', MY_PAYMENT_CARDS],
    ['myProfile', MY_PROFILE],
  ])(
    "refuses a pending deletion's token on %s with UNAUTHENTICATED",
    async (_name, query) => {
      const response = await graphql(query, tokenFor(pendingUserId));

      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    },
  );

  it.each([
    ['myPaymentCards', MY_PAYMENT_CARDS],
    ['myProfile', MY_PROFILE],
  ])(
    "refuses a completed deletion's token on %s with UNAUTHENTICATED",
    async (_name, query) => {
      const response = await graphql(query, tokenFor(completedUserId));

      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    },
  );

  it("still serves another user's token", async () => {
    const response = await graphql(MY_PAYMENT_CARDS, tokenFor(otherUserId));

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.myPaymentCards).toEqual([]);
  });
});
