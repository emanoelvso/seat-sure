import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BillingModule } from '@billingModule/billing.module';
import { AccountStatusApi } from '@sharedModules/integration/interface/account-status.interface';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

// The status provider is optional: an app that doesn't load Identity keeps
// authenticating from the JWT alone.
describe('AuthGuard without an account status provider (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
  });

  afterAll(async () => {
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('billing'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('serves the token of any user when no provider is registered', async () => {
    // Guards the premise: the app really has no AccountStatusApi
    expect(() => module.get(AccountStatusApi, { strict: false })).toThrow();

    const token = module.get(JwtService).sign({
      sub: randomUUID(),
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'query { myPaymentCards { id } }' });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.myPaymentCards).toEqual([]);
  });
});
