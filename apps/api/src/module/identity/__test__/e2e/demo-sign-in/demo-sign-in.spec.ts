import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { SessionService } from '@identityModule/core/service/session.service';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import {
  orderItemFactory,
  orderFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { AppModule } from '@src/app.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { initializeTransactionalContext } from 'typeorm-transactional';

const DEMO =
  'mutation { demoSignIn { accessToken refreshToken expiresAt persistent } }';
const blocked = [
  [
    'signUp',
    'mutation { signUp(input:{firstName:"Visitor",lastName:"Test",email:"supplied@example.com",password:"correct-horse"}) { email } }',
  ],
  [
    'logIn',
    'mutation { logIn(input:{email:"supplied@example.com",password:"correct-horse",rememberMe:false}) { status } }',
  ],
  [
    'verifyEmail',
    'mutation { verifyEmail(input:{email:"supplied@example.com",code:"123456",rememberMe:false}) { accessToken } }',
  ],
  [
    'resendCode',
    'mutation { resendCode(input:{email:"supplied@example.com",purpose:VERIFY_EMAIL}) { codeSent } }',
  ],
  [
    'requestPasswordReset',
    'mutation { requestPasswordReset(input:{email:"supplied@example.com"}) { codeSent } }',
  ],
  [
    'confirmPasswordResetCode',
    'mutation { confirmPasswordResetCode(input:{email:"supplied@example.com",code:"123456"}) { resetToken } }',
  ],
  [
    'resetPassword',
    'mutation { resetPassword(input:{resetToken:"supplied-token",newPassword:"correct-horse"}) }',
  ],
];

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
    Tables.NotificationsNotification,
  ])
    await testDbClient(table).del();
};

describe('Isolated visitor demo (REL-14/15/16/18/19/23)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let config: ConfigService;
  const gql = (query: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call.send({ query });
  };
  const reason = (body: any) =>
    body.errors?.[0]?.extensions.originalError?.reason;

  beforeAll(async () => {
    initializeTransactionalContext();
    config = new ConfigService({
      ...factory(),
      demo: { ...factory().demo, enabled: true },
      auth: { ...factory().auth, codeSender: 'disabled' },
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
    config.set('demo', { ...config.get('demo'), enabled: true });
    await clean();
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

  it('creates a verified synthetic user/profile and returns real session tokens', async () => {
    const response = await gql(DEMO);
    expect(response.body.errors).toBeUndefined();
    const session = response.body.data.demoSignIn;
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
    const claims = module.get(JwtService).verify(session.accessToken);
    const user = await testDbClient(Tables.IdentityUser)
      .where({ id: claims.sub })
      .first();
    expect(user.email).toMatch(/^[0-9a-f-]{36}@demo\.invalid$/);
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    const profile = await testDbClient(Tables.UserProfileUser)
      .where({ id: claims.sub })
      .first();
    expect(profile).toMatchObject({
      id: claims.sub,
      firstName: 'Demo',
      lastName: 'Visitor',
    });
    expect(
      await testDbClient(Tables.IdentityVerificationCode).select(),
    ).toEqual([]);
  });

  it('uses nonpersistent sessions lasting exactly 24 hours', async () => {
    const response = await gql(DEMO);
    const session = response.body.data.demoSignIn;
    const row = await testDbClient(Tables.IdentitySession).first();
    expect(session.persistent).toBe(false);
    expect(row.persistent).toBe(false);
    expect(
      new Date(row.expiresAt).getTime() - new Date(row.createdAt).getTime(),
    ).toBe(24 * 60 * 60 * 1000);
    expect(new Date(session.expiresAt).getTime()).toBe(
      new Date(row.expiresAt).getTime(),
    );
  });

  it('creates distinct accounts and sessions for two visitors', async () => {
    const first = (await gql(DEMO)).body.data.demoSignIn;
    const second = (await gql(DEMO)).body.data.demoSignIn;
    expect(first.accessToken).not.toBe(second.accessToken);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    const users = await testDbClient(Tables.IdentityUser).select('id', 'email');
    expect(users).toHaveLength(2);
    expect(users[0].email).not.toBe(users[1].email);
    expect(await testDbClient(Tables.UserProfileUser).select()).toHaveLength(2);
    expect(await testDbClient(Tables.IdentitySession).select()).toHaveLength(2);
  });

  it('returns DEMO_DISABLED without writes when demo is off', async () => {
    config.set('demo', { ...config.get('demo'), enabled: false });
    const response = await gql(DEMO);
    expect(reason(response.body)).toBe('DEMO_DISABLED');
    for (const table of [
      Tables.IdentityUser,
      Tables.UserProfileUser,
      Tables.IdentitySession,
    ])
      expect(await testDbClient(table).select()).toEqual([]);
  });

  it.each(blocked)(
    'blocks %s before storing email, codes or sessions',
    async (_name, query) => {
      const sender = jest.spyOn(module.get<CodeSender>(CodeSender), 'send');
      const response = await gql(query);
      expect(reason(response.body)).toBe('DEMO_ONLY');
      for (const table of [
        Tables.IdentityUser,
        Tables.IdentityVerificationCode,
        Tables.IdentityPasswordResetGrant,
        Tables.IdentitySession,
        Tables.UserProfileUser,
      ])
        expect(await testDbClient(table).select()).toEqual([]);
      expect(sender).not.toHaveBeenCalled();
    },
  );

  it('compensates profile failure with a generic response and no account or session', async () => {
    jest
      .spyOn(module.get<UserProfileApi>(UserProfileApi), 'createProfile')
      .mockRejectedValueOnce(new Error('private backend detail'));
    const response = await gql(DEMO);
    expect(response.body.errors[0].message).toBe(
      'Something went wrong. Please try again.',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private backend detail',
    );
    expect(await testDbClient(Tables.IdentityUser).select()).toEqual([]);
    expect(await testDbClient(Tables.IdentitySession).select()).toEqual([]);
  });

  it('removes the unusable account when session creation fails', async () => {
    jest
      .spyOn(module.get(SessionService), 'start')
      .mockRejectedValueOnce(new Error('private session detail'));
    const response = await gql(DEMO);
    expect(response.body.errors[0].message).toBe(
      'Something went wrong. Please try again.',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private session detail',
    );
    expect(await testDbClient(Tables.IdentityUser).select()).toEqual([]);
    expect(await testDbClient(Tables.IdentitySession).select()).toEqual([]);
  });

  it('isolates profile data, cards and order access between visitors', async () => {
    const first = (await gql(DEMO)).body.data.demoSignIn;
    const second = (await gql(DEMO)).body.data.demoSignIn;
    const userId = module.get(JwtService).verify(first.accessToken).sub;
    const otherId = module.get(JwtService).verify(second.accessToken).sub;
    await testDbClient(Tables.UserProfileUser)
      .where({ id: userId })
      .update({ firstName: 'First visitor' });
    const card = {
      id: randomUUID(),
      userId,
      provider: 'simulated',
      providerToken: `sim_pm_${randomUUID()}`,
      fingerprint: randomUUID(),
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2030,
      holder: 'Demo Visitor',
      isDefault: true,
    };
    await testDbClient(Tables.BillingPaymentCard).insert(card);
    const order = orderFactory.build({ userId });
    await testDbClient(Tables.Order).insert(order);
    await testDbClient(Tables.OrderItem).insert(
      orderItemFactory.build({ orderId: order.id }),
    );
    const query = `{ me { id firstName } myPaymentCards { id } findCheckoutOrder(input:{orderId:"${order.id}"}) { id } }`;
    const owner = await gql(query, first.accessToken);
    const other = await gql(query, second.accessToken);
    expect(owner.body.errors).toBeUndefined();
    expect(owner.body.data.me).toEqual({
      id: userId,
      firstName: 'First visitor',
    });
    expect(owner.body.data.myPaymentCards).toEqual([{ id: card.id }]);
    expect(owner.body.data.findCheckoutOrder).toEqual({ id: order.id });
    expect(other.body.errors).toBeUndefined();
    expect(other.body.data.me).toEqual({ id: otherId, firstName: 'Demo' });
    expect(other.body.data.myPaymentCards).toEqual([]);
    expect(other.body.data.findCheckoutOrder).toBeNull();
  });
});
