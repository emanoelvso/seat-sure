import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { AppModule } from '@src/app.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const INPUT =
  '{number:"5555555555554444",holder:"Demo Visitor",expiry:"12/39",cvv:"123"}';
const clean = async () => {
  for (const table of [
    Tables.Ticket,
    Tables.SeatHold,
    Tables.OrderItem,
    Tables.Order,
    Tables.BillingPaymentCard,
    Tables.BillingCardThrottle,
    Tables.BillingPayment,
    Tables.IdentitySession,
    Tables.IdentityVerificationCode,
    Tables.IdentityPasswordResetGrant,
    Tables.IdentityLoginThrottle,
    Tables.IdentityUser,
    Tables.UserProfileUser,
  ])
    await testDbClient(table).del();
};

describe('Demo card GraphQL boundary (REL-22)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let token: string;
  let userId: string;
  const gql = (query: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query });
  const error = (body: any) => body.errors?.[0]?.extensions.originalError;

  beforeAll(async () => {
    initializeTransactionalContext();
    const base = factory();
    const config = new ConfigService({
      ...base,
      demo: { ...base.demo, enabled: true },
      auth: { ...base.auth, codeSender: 'disabled' },
    });
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();
    app = module.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    await clean();
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'mutation { demoSignIn { accessToken } }' });
    token = result.body.data.demoSignIn.accessToken;
    userId = module.get(JwtService).verify(token).sub;
  });
  afterAll(async () => {
    await clean();
    for (const name of [
      'identity',
      'user-profile',
      'catalog',
      'ticketing',
      'billing',
      'notifications',
    ]) {
      const datasource = module.get<DataSource>(getDataSourceToken(name));
      if (datasource.isInitialized) await datasource.destroy();
    }
    await app.getHttpServer().close();
    await testDbClient.destroy();
  });

  it('rejects non-test saved-card entry through the authenticated API before tokenization', async () => {
    const tokenize = jest.spyOn(
      module.get<PaymentGateway>(PaymentGateway),
      'tokenize',
    );
    const response = await gql(
      `mutation { addPaymentCard(input:${INPUT}) { id } }`,
    );
    expect(error(response.body)).toMatchObject({
      reason: 'INVALID_CARD',
      fields: { number: 'Use a documented simulator test card.' },
    });
    expect(tokenize).not.toHaveBeenCalled();
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual([]);
  });

  it('rejects non-test checkout through the authenticated API before charge or order transition', async () => {
    const order = orderFactory.build({ userId });
    await testDbClient(Tables.Order).insert(order);
    await testDbClient(Tables.OrderItem).insert(
      orderItemFactory.build({ orderId: order.id }),
    );
    const before = await testDbClient(Tables.Order)
      .where({ id: order.id })
      .first();
    const charge = jest.spyOn(
      module.get<PaymentGateway>(PaymentGateway),
      'charge',
    );
    const response = await gql(
      `mutation { payOrder(input:{orderId:"${order.id}",card:${INPUT}}) { status } }`,
    );
    expect(error(response.body)).toMatchObject({
      reason: 'INVALID_CARD',
      fields: { number: 'Use a documented simulator test card.' },
    });
    expect(charge).not.toHaveBeenCalled();
    expect(await testDbClient(Tables.BillingPayment).select()).toEqual([]);
    expect(
      await testDbClient(Tables.Order).where({ id: order.id }).first(),
    ).toEqual(before);
  });
});
