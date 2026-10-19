import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '@src/app.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { initializeTransactionalContext } from 'typeorm-transactional';

const DEMO = 'mutation { demoSignIn { accessToken } }';
const clean = async () => {
  for (const table of [
    Tables.IdentitySession,
    Tables.IdentityVerificationCode,
    Tables.IdentityPasswordResetGrant,
    Tables.IdentityLoginThrottle,
    Tables.IdentityUser,
    Tables.UserProfileUser,
  ])
    await testDbClient(table).del();
};

describe('Demo mutation request budget (REL-20)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let config: ConfigService;
  let now = Date.now();
  const gql = (query = DEMO, forwarded?: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (forwarded) call.set('X-Forwarded-For', forwarded);
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call.send({ query });
  };
  const status = (body: any) =>
    body.errors?.[0]?.extensions.originalError?.statusCode;

  beforeAll(async () => {
    initializeTransactionalContext();
    const base = factory();
    config = new ConfigService({
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
    now += 10000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    config.set('demo', {
      enabled: true,
      maxRequests: 2,
      windowMs: 1000,
      maxBuckets: 2,
    });
    app.getHttpAdapter().getInstance().set('trust proxy', false);
    await clean();
  });
  afterAll(async () => {
    jest.restoreAllMocks();
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

  it('allows the exact threshold then returns 429 before creating account/profile/session', async () => {
    expect((await gql()).body.errors).toBeUndefined();
    expect((await gql()).body.errors).toBeUndefined();
    expect(status((await gql()).body)).toBe(429);
    for (const table of [
      Tables.IdentityUser,
      Tables.UserProfileUser,
      Tables.IdentitySession,
    ])
      expect(await testDbClient(table).select()).toHaveLength(2);
  });

  it('keeps the window closed before its boundary and reopens exactly at expiry', async () => {
    await gql();
    await gql();
    now += 999;
    expect(status((await gql()).body)).toBe(429);
    now += 1;
    expect((await gql()).body.errors).toBeUndefined();
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(3);
  });

  it('does not throttle when demo mode is disabled', async () => {
    config.set('demo', { ...config.get('demo'), enabled: false });
    for (let i = 0; i < 4; i++) {
      const body = (await gql()).body;
      expect(body.errors[0].extensions.originalError.reason).toBe(
        'DEMO_DISABLED',
      );
      expect(status(body)).toBe(422);
    }
    expect(await testDbClient(Tables.IdentityUser).select()).toEqual([]);
  });

  it('counts aliased mutation fields individually and rejects before a third account', async () => {
    const body = (
      await gql(
        'mutation { a: demoSignIn { accessToken } b: demoSignIn { accessToken } c: demoSignIn { accessToken } }',
      )
    ).body;
    expect(status(body)).toBe(429);
    expect(body.errors[0].path).toEqual(['c']);
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(2);
  });

  it('ignores spoofed forwarding headers without explicit proxy trust', async () => {
    config.set('demo', { ...config.get('demo'), maxBuckets: 10 });
    await gql(DEMO, '192.0.2.1');
    await gql(DEMO, '192.0.2.2');
    expect(status((await gql(DEMO, '192.0.2.3')).body)).toBe(429);
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(2);
  });

  it('uses forwarded identity only when the connecting proxy is explicitly trusted', async () => {
    app.getHttpAdapter().getInstance().set('trust proxy', ['loopback']);
    await gql(DEMO, '192.0.2.1');
    await gql(DEMO, '192.0.2.1');
    expect(status((await gql(DEMO, '192.0.2.1')).body)).toBe(429);
    expect((await gql(DEMO, '192.0.2.2')).body.errors).toBeUndefined();
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(3);
  });

  describe('client address forwarded by the web server', () => {
    const SECRET = 'f'.repeat(16) + '0'.repeat(16);
    const forwardedAs = (
      address: string | undefined,
      secret: string | undefined = SECRET,
    ) => {
      const call = request(app.getHttpServer()).post('/graphql');
      if (address) call.set('X-Seat-Sure-Client-Ip', address);
      if (secret) call.set('X-Seat-Sure-Client-Secret', secret);
      return call.send({ query: DEMO });
    };
    beforeEach(() => {
      config.set('app', { ...config.get('app'), clientAddressSecret: SECRET });
      config.set('demo', { ...config.get('demo'), maxBuckets: 10 });
    });
    afterEach(() => {
      config.set('app', {
        ...config.get('app'),
        clientAddressSecret: undefined,
      });
    });

    it('gives each forwarded visitor address its own budget', async () => {
      for (const address of ['198.51.100.1', '198.51.100.1'])
        expect((await forwardedAs(address)).body.errors).toBeUndefined();
      expect(status((await forwardedAs('198.51.100.1')).body)).toBe(429);
      expect((await forwardedAs('198.51.100.2')).body.errors).toBeUndefined();
      expect((await forwardedAs('2001:db8::1')).body.errors).toBeUndefined();
      expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(4);
    });

    it.each([
      ['a wrong secret', (i: number) => `198.51.100.${i}`, 'e'.repeat(32)],
      ['no secret header', (i: number) => `198.51.100.${i}`, ''],
      ['an invalid address', (i: number) => `not-an-ip-${i}`, SECRET],
    ])(
      'ignores the forwarded address with %s and rate limits the connection instead',
      async (_name, address, secret) => {
        await forwardedAs(address(1), secret);
        await forwardedAs(address(2), secret);
        expect(status((await forwardedAs(address(3), secret)).body)).toBe(429);
        expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(
          2,
        );
      },
    );

    it('prefers the authenticated client address over a differing X-Forwarded-For', async () => {
      for (const spoofed of ['203.0.113.1', '203.0.113.2']) {
        const call = request(app.getHttpServer())
          .post('/graphql')
          .set('X-Seat-Sure-Client-Ip', '198.51.100.9')
          .set('X-Seat-Sure-Client-Secret', SECRET)
          .set('X-Forwarded-For', spoofed);
        expect((await call.send({ query: DEMO })).body.errors).toBeUndefined();
      }
      const third = request(app.getHttpServer())
        .post('/graphql')
        .set('X-Seat-Sure-Client-Ip', '198.51.100.9')
        .set('X-Seat-Sure-Client-Secret', SECRET)
        .set('X-Forwarded-For', '203.0.113.3');
      expect(status((await third.send({ query: DEMO })).body)).toBe(429);
    });

    it('ignores the forwarded address when no secret is configured', async () => {
      config.set('app', {
        ...config.get('app'),
        clientAddressSecret: undefined,
      });
      await forwardedAs('198.51.100.1');
      await forwardedAs('198.51.100.2');
      expect(status((await forwardedAs('198.51.100.3')).body)).toBe(429);
      expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(2);
    });
  });

  it('bounds buckets, refuses new clients at capacity, then reclaims expired buckets', async () => {
    app.getHttpAdapter().getInstance().set('trust proxy', ['loopback']);
    await gql(DEMO, '192.0.2.1');
    await gql(DEMO, '192.0.2.2');
    expect(status((await gql(DEMO, '192.0.2.3')).body)).toBe(429);
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(2);
    now += 1000;
    expect((await gql(DEMO, '192.0.2.3')).body.errors).toBeUndefined();
    expect(await testDbClient(Tables.IdentityUser).select()).toHaveLength(3);
  });

  it('rejects saved-card and checkout mutations before gateway or database effects', async () => {
    const token = (await gql()).body.data.demoSignIn.accessToken;
    await gql();
    const gateway = module.get<PaymentGateway>(PaymentGateway);
    const tokenize = jest.spyOn(gateway, 'tokenize');
    const charge = jest.spyOn(gateway, 'authorize');
    const cards = await testDbClient(Tables.BillingPaymentCard).select();
    const payments = await testDbClient(Tables.BillingPayment).select();
    const cardInput =
      '{ number:"4242424242424242",holder:"Demo Visitor",expiry:"12/39",cvv:"123" }';
    expect(
      status(
        (
          await gql(
            `mutation { addPaymentCard(input:${cardInput}) { id } }`,
            undefined,
            token,
          )
        ).body,
      ),
    ).toBe(429);
    expect(
      status(
        (
          await gql(
            `mutation { payOrder(input:{orderId:"00000000-0000-4000-8000-000000000001",card:${cardInput}}) { status } }`,
            undefined,
            token,
          )
        ).body,
      ),
    ).toBe(429);
    expect(tokenize).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
    expect(await testDbClient(Tables.BillingPaymentCard).select()).toEqual(
      cards,
    );
    expect(await testDbClient(Tables.BillingPayment).select()).toEqual(
      payments,
    );
  });

  it('never consumes mutation budget for read-only queries', async () => {
    for (let i = 0; i < 4; i++)
      expect((await gql('{ __typename }')).body.data.__typename).toBe('Query');
    expect((await gql()).body.errors).toBeUndefined();
    expect((await gql()).body.errors).toBeUndefined();
    expect(status((await gql()).body)).toBe(429);
  });
});
