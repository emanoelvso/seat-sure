import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { BillingModule } from '@billingModule/billing.module';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { testDbClient } from '@testInfra/knex.database';
import { Tables } from '@testInfra/enum/table.enum';
import { Plan } from '@billingModule/persistence/entity/plan.entity';
import { PlanInterval } from '@billingModule/core/enum/plan-interval.enum';
import { SubscriptionStatus } from '@billingModule/core/enum/subscription-status.enum';
import { faker } from '@faker-js/faker';

const fakeUserId = faker.string.uuid();
jest.mock('jsonwebtoken', () => ({
  verify: (_token: string, _secret: string, _options: any, callback: any) => {
    callback(null, { sub: fakeUserId });
  },
}));

describe('Subscription e2e test', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([BillingModule]);
    app = nestTestSetup.app;
    module = nestTestSetup.module;
  });

  beforeEach(async () => {
    jest
      .useFakeTimers({ advanceTimers: true })
      .setSystemTime(new Date('2023-01-01'));
  });

  afterEach(async () => {
    await testDbClient(Tables.Subscription).del();
    await testDbClient(Tables.Plan).del();
  });

  afterAll(async () => {
    //TODO move it to be shared
    await app.close();
    module.close();
  });

  it('creates a subscription', async () => {
    const plan = new Plan({
      name: 'Basic',
      description: 'Basic montly plan',
      currency: 'USD',
      amount: 10,
      interval: PlanInterval.Month,
      trialPeriod: 7,
    });

    await testDbClient(Tables.Plan).insert(plan);

    const res = await request(app.getHttpServer())
      .post('/subscription')
      .set('Authorization', `Bearer fake-token`)
      .send({ planId: plan.id });
    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body).toEqual({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      deletedAt: null,
      userId: expect.any(String),
      planId: plan.id,
      status: SubscriptionStatus.Active,
      startDate: expect.any(String),
      endDate: null,
      autoRenew: true,
      plan: expect.any(Object),
    });
  });

  it('throws error if the plan does not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/subscription')
      .set('Authorization', `Bearer fake-token`)
      .send({ planId: randomUUID() });
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});
