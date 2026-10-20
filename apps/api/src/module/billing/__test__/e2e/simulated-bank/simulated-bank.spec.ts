import { randomUUID } from 'crypto';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const CHALLENGE_CARD = {
  number: '4000 0027 6000 3184',
  holder: 'Jane Doe',
  expiry: '06/39',
  cvv: '123',
};

describe('Simulated bank endpoint (GW-20, GW-21, GW-22)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let gateway: SimulatedPaymentGateway & PaymentGateway;
  let config: ConfigService;

  const challenge = async () => {
    const result = await gateway.authorize(
      {
        amountCents: 26000,
        currency: 'USD',
        source: { type: 'card', card: CHALLENGE_CARD },
      },
      `${randomUUID()}:authorize`,
    );
    if (result.status !== 'requires_action') {
      throw new Error('expected a challenge');
    }
    return result;
  };
  const answer = (clientSecret: string, body: unknown) =>
    request(app.getHttpServer())
      .post(`/billing/simulated-3ds/${clientSecret}`)
      .send(body as object);

  beforeAll(async () => {
    ({ app, module } = await createNestApp());
    gateway = module.get(SimulatedPaymentGateway, { strict: false });
    config = module.get(ConfigService, { strict: false });
  });

  beforeEach(async () => {
    await testDbClient(Tables.BillingSimulatedPayment).del();
  });

  afterEach(() => {
    config.set('billing', { ...config.get('billing'), gateway: 'simulated' });
  });

  afterAll(async () => {
    await testDbClient(Tables.BillingSimulatedPayment).del();
    for (const name of [
      'catalog',
      'ticketing',
      'identity',
      'user-profile',
      'billing',
      'notifications',
    ]) {
      const datasource = module.get<DataSource>(getDataSourceToken(name));
      if (datasource.isInitialized) await datasource.destroy();
    }
    await app.getHttpServer().close();
    await testDbClient.destroy();
  });

  it('answers 204 to approve and authorizes the payment', async () => {
    const { clientSecret, providerPaymentId } = await challenge();

    const response = await answer(clientSecret, { outcome: 'approve' });

    expect(response.status).toBe(204);
    expect(await gateway.getPayment(providerPaymentId)).toEqual({
      status: 'authorized',
    });
  });

  it('answers 204 to fail and marks the authentication failed', async () => {
    const { clientSecret, providerPaymentId } = await challenge();

    const response = await answer(clientSecret, { outcome: 'fail' });

    expect(response.status).toBe(204);
    expect(await gateway.getPayment(providerPaymentId)).toEqual({
      status: 'authentication_failed',
    });
  });

  it.each([
    ['an outcome other than approve or fail', { outcome: 'maybe' }],
    ['a missing outcome', {}],
    ['a non-string outcome', { outcome: 1 }],
  ])('answers 400 to %s and changes nothing', async (_name, body) => {
    const { clientSecret, providerPaymentId } = await challenge();

    const response = await answer(clientSecret, body);

    expect(response.status).toBe(400);
    expect(await gateway.getPayment(providerPaymentId)).toEqual({
      status: 'requires_action',
      clientSecret,
    });
  });

  it('answers 404 to an unknown client secret', async () => {
    const response = await answer('sim_secret_unknown', { outcome: 'approve' });

    expect(response.status).toBe(404);
  });

  it('answers 404 to a payment that is no longer awaiting a challenge and changes nothing', async () => {
    const { clientSecret, providerPaymentId } = await challenge();
    await answer(clientSecret, { outcome: 'approve' });

    const response = await answer(clientSecret, { outcome: 'fail' });

    expect(response.status).toBe(404);
    expect(await gateway.getPayment(providerPaymentId)).toEqual({
      status: 'authorized',
    });
  });

  it('answers 404 when the gateway is stripe and changes nothing', async () => {
    const { clientSecret, providerPaymentId } = await challenge();
    config.set('billing', { ...config.get('billing'), gateway: 'stripe' });

    const response = await answer(clientSecret, { outcome: 'approve' });

    expect(response.status).toBe(404);
    expect(await gateway.getPayment(providerPaymentId)).toEqual({
      status: 'requires_action',
      clientSecret,
    });
  });
});
