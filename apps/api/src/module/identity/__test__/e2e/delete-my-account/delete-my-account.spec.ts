import { randomUUID } from 'crypto';
import { INestApplication, Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
  CodeSender,
  SendCodeInput,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import { notificationFactory } from '@notificationsModule/__test__/factory/notifications-notification.factory';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { factory } from '@sharedModules/config/util/config.factory';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { applyGlobalValidation } from '@sharedModules/validation/util/global-validation.util';
import { AppModule } from '@src/app.module';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
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

  lastCode(): string {
    return this.sent[this.sent.length - 1].code;
  }
}

const DELETE_MY_ACCOUNT = `
  mutation DeleteMyAccount($input: DeleteMyAccountInput!) {
    deleteMyAccount(input: $input)
  }
`;
const SIGN_UP = `
  mutation SignUp($input: SignUpInput!) { signUp(input: $input) { email } }
`;
const VERIFY_EMAIL = `
  mutation VerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) { accessToken refreshToken }
  }
`;
const LOG_IN = `
  mutation LogIn($input: LogInInput!) { logIn(input: $input) { status } }
`;
const REQUEST_RESET = `
  mutation RequestReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input) { codeSent }
  }
`;
const CONFIRM_RESET = `
  mutation ConfirmReset($input: ConfirmPasswordResetCodeInput!) {
    confirmPasswordResetCode(input: $input) { resetToken }
  }
`;
const REFRESH = `
  mutation Refresh($input: RefreshSessionInput!) {
    refreshSession(input: $input) { accessToken }
  }
`;
const DEMO_SIGN_IN = 'mutation { demoSignIn { accessToken refreshToken } }';
const PROTECTED_QUERIES = {
  myPaymentCards: 'query { myPaymentCards { id } }',
  myProfile: 'query { myProfile { firstName } }',
  myNotifications:
    'query { myNotifications(input: { page: 1, pageSize: 10 }) { page } }',
};

const PASSWORD = 'correct-horse';
const DAY = 24 * 60 * 60 * 1000;

const CLEANED_TABLES = [
  Tables.Ticket,
  Tables.SeatHold,
  Tables.OrderItem,
  Tables.Order,
  Tables.BillingPaymentCard,
  Tables.BillingPendingCard,
  Tables.BillingCardThrottle,
  Tables.BillingCustomer,
  Tables.BillingPayment,
  Tables.IdentitySession,
  Tables.IdentityVerificationCode,
  Tables.IdentityPasswordResetGrant,
  Tables.IdentityLoginThrottle,
  Tables.IdentityAccountDeletion,
  Tables.IdentityUser,
  Tables.UserProfileUser,
  Tables.NotificationsNotification,
];

const clean = async () => {
  for (const table of CLEANED_TABLES) {
    await testDbClient(table).del();
  }
};

interface Account {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

describe('deleteMyAccount (e2e, AppModule)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let config: ConfigService;
  let codeSender: FakeCodeSender;
  let jwtService: JwtService;

  const gql = (
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call.send({ query, variables });
  };
  const reasonOf = (body: any) =>
    body.errors?.[0]?.extensions?.originalError?.reason;
  const codeOf = (body: any) => body.errors?.[0]?.extensions?.code;
  const deleteAccount = (token: string, confirmation = 'DELETE') =>
    gql(DELETE_MY_ACCOUNT, { input: { confirmation } }, token);

  const signUpAndVerify = async (): Promise<Account> => {
    const email = `ada-${randomUUID()}@example.com`;
    await gql(SIGN_UP, {
      input: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email,
        password: PASSWORD,
      },
    });
    const verified = await gql(VERIFY_EMAIL, {
      input: { email, code: codeSender.lastCode(), rememberMe: false },
    });
    const { accessToken, refreshToken } = verified.body.data.verifyEmail;
    return {
      userId: jwtService.verify(accessToken).sub,
      email,
      accessToken,
      refreshToken,
    };
  };

  // Everything a deleted user owns in every module, plus the financial
  // records the deletion must leave alone
  const seedData = async (userId: string) => {
    // Billing rows are built inline: lint keeps Identity tests from importing
    // Billing's factories
    const card = {
      id: randomUUID(),
      userId,
      provider: 'simulated',
      providerToken: `sim_pm_${randomUUID()}`,
      fingerprint: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2030,
      holder: 'Ada Lovelace',
      isDefault: true,
    };
    const notification = notificationFactory.build({ userId });
    const order = orderFactory.build({
      userId,
      status: OrderStatus.PAID,
      eventStartAt: new Date(Date.now() - DAY),
      paidAt: new Date(Date.now() - 2 * DAY),
    });
    const item = orderItemFactory.build({ orderId: order.id });
    // An issued ticket whose event already started does not block deletion
    const ticket = { ...ticketFactory.build({ userId }), orderItemId: item.id };
    const payment = {
      id: randomUUID(),
      userId,
      orderId: order.id,
      provider: 'simulated',
      providerPaymentId: `sim_${randomUUID()}`,
      amountCents: 110700,
      currency: 'USD',
      status: 'succeeded',
      cardBrand: 'visa',
      cardLast4: '4242',
    };
    await testDbClient(Tables.BillingPaymentCard).insert(card);
    await testDbClient(Tables.BillingCustomer).insert({
      id: randomUUID(),
      userId,
      provider: 'simulated',
      providerCustomerId: `sim_cus_${randomUUID()}`,
    });
    await testDbClient(Tables.NotificationsNotification).insert(notification);
    await testDbClient(Tables.SeatHold).insert(
      seatHoldFactory.build({ userId }),
    );
    await testDbClient(Tables.Order).insert(order);
    await testDbClient(Tables.OrderItem).insert(item);
    await testDbClient(Tables.Ticket).insert(ticket);
    await testDbClient(Tables.BillingPayment).insert(payment);
    return { card };
  };

  const ownedRows = async (userId: string, email: string) => ({
    identityUser: await testDbClient(Tables.IdentityUser).where({ id: userId }),
    sessions: await testDbClient(Tables.IdentitySession).where({ userId }),
    codes: await testDbClient(Tables.IdentityVerificationCode).where({
      userId,
    }),
    grants: await testDbClient(Tables.IdentityPasswordResetGrant).where({
      userId,
    }),
    throttle: await testDbClient(Tables.IdentityLoginThrottle).where({ email }),
    profile: await testDbClient(Tables.UserProfileUser).where({ id: userId }),
    notifications: await testDbClient(Tables.NotificationsNotification).where({
      userId,
    }),
    seatHolds: await testDbClient(Tables.SeatHold).where({ userId }),
    cards: await testDbClient(Tables.BillingPaymentCard).where({ userId }),
    customers: await testDbClient(Tables.BillingCustomer).where({ userId }),
  });

  const financialRows = (userId: string) =>
    Promise.all([
      testDbClient(Tables.Order).where({ userId }).orderBy('id'),
      testDbClient(Tables.OrderItem).orderBy('id'),
      testDbClient(Tables.Ticket).where({ userId }).orderBy('id'),
      testDbClient(Tables.BillingPayment).where({ userId }).orderBy('id'),
    ]);

  beforeAll(async () => {
    initializeTransactionalContext();
    config = new ConfigService({
      ...factory(),
      demo: { ...factory().demo, enabled: false },
    });
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(CodeSender)
      .useClass(FakeCodeSender)
      .compile();
    app = module.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
    codeSender = module.get<FakeCodeSender>(CodeSender);
    jwtService = module.get(JwtService);
  }, 60000);

  beforeEach(async () => {
    jest.restoreAllMocks();
    config.set('demo', { ...config.get('demo'), enabled: false });
    codeSender.sent = [];
    await clean();
  });

  afterAll(async () => {
    await clean();
    await testDbClient.destroy();
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
  });

  describe('a successful deletion', () => {
    let account: Account;
    let other: Account;
    let logged: string;
    let seeded: Awaited<ReturnType<typeof seedData>>;
    let financialBefore: Awaited<ReturnType<typeof financialRows>>;
    let response: request.Response;

    beforeEach(async () => {
      account = await signUpAndVerify();
      other = await signUpAndVerify();
      seeded = await seedData(account.userId);
      await seedData(other.userId);
      // A throttle row and a reset grant, both tied to the account's email
      await gql(LOG_IN, {
        input: { email: account.email, password: 'wrong', rememberMe: false },
      });
      await gql(REQUEST_RESET, { input: { email: account.email } });
      await gql(CONFIRM_RESET, {
        input: { email: account.email, code: codeSender.lastCode() },
      });
      financialBefore = await financialRows(account.userId);

      const lines: unknown[] = [];
      const logger = module.get(AppLogger);
      for (const level of ['log', 'warn', 'error'] as const) {
        jest
          .spyOn(logger, level)
          .mockImplementation((...args: unknown[]) => void lines.push(args));
      }
      response = await deleteAccount(account.accessToken);
      logged = JSON.stringify(lines);
    });

    it('returns true (AC 1)', () => {
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteMyAccount).toBe(true);
    });

    it('hard-deletes identity, sessions, codes, grants and throttle rows (AC 3)', async () => {
      const rows = await ownedRows(account.userId, account.email);

      expect(rows.identityUser).toEqual([]);
      expect(rows.sessions).toEqual([]);
      expect(rows.codes).toEqual([]);
      expect(rows.grants).toEqual([]);
      expect(rows.throttle).toEqual([]);
    });

    it('records the deletion as completed', async () => {
      const [deletion] = await testDbClient(Tables.IdentityAccountDeletion)
        .where({ userId: account.userId })
        .select('completedAt');

      expect(deletion.completedAt).not.toBeNull();
    });

    it('hard-deletes the profile row (AC 4)', async () => {
      const rows = await ownedRows(account.userId, account.email);

      expect(rows.profile).toEqual([]);
    });

    it('deletes the notifications (AC 5)', async () => {
      const rows = await ownedRows(account.userId, account.email);

      expect(rows.notifications).toEqual([]);
    });

    it('deletes the seat holds (AC 6)', async () => {
      const rows = await ownedRows(account.userId, account.email);

      expect(rows.seatHolds).toEqual([]);
    });

    it('deletes the saved cards and the billing customer (ERASE-01)', async () => {
      const rows = await ownedRows(account.userId, account.email);

      expect(rows.cards).toEqual([]);
      expect(rows.customers).toEqual([]);
    });

    it('keeps orders, items, tickets and payments unchanged (AC 7)', async () => {
      const after = await financialRows(account.userId);

      expect(financialBefore[0]).toHaveLength(1);
      expect(after).toEqual(financialBefore);
    });

    it("leaves another user's data alone", async () => {
      const rows = await ownedRows(other.userId, other.email);

      expect(rows.identityUser).toHaveLength(1);
      expect(rows.profile).toHaveLength(1);
      // The welcome notification from sign-up plus the seeded one
      expect(rows.notifications).toHaveLength(2);
      expect(rows.seatHolds).toHaveLength(1);
      expect(rows.cards).toHaveLength(1);
      expect(rows.customers).toHaveLength(1);
    });

    it('lets the same email sign up again (AC 8)', async () => {
      const signUp = await gql(SIGN_UP, {
        input: {
          firstName: 'Ada',
          lastName: 'Again',
          email: account.email,
          password: PASSWORD,
        },
      });

      expect(signUp.body.errors).toBeUndefined();
      expect(signUp.body.data.signUp.email).toBe(account.email);
    });

    it.each(Object.entries(PROTECTED_QUERIES))(
      'refuses the old access token on %s with UNAUTHENTICATED (AC 13)',
      async (_name, query) => {
        const result = await gql(query, undefined, account.accessToken);

        expect(codeOf(result.body)).toBe('UNAUTHENTICATED');
      },
    );

    it('refuses the old refresh token (AC 14)', async () => {
      const refreshed = await gql(REFRESH, {
        input: { refreshToken: account.refreshToken },
      });

      expect(codeOf(refreshed.body)).toBe('UNAUTHENTICATED');
    });

    it('writes no token, fingerprint or provider id to a log line (SC 4)', () => {
      for (const secret of [
        account.accessToken,
        account.refreshToken,
        seeded.card.providerToken,
        seeded.card.fingerprint,
      ]) {
        expect(logged).not.toContain(secret);
      }
    });
  });

  describe('refusals', () => {
    let account: Account;

    beforeEach(async () => {
      account = await signUpAndVerify();
    });

    const expectNothingChanged = async () => {
      const rows = await ownedRows(account.userId, account.email);
      expect(rows.identityUser).toHaveLength(1);
      expect(rows.profile).toHaveLength(1);
      expect(rows.sessions.every((s: any) => s.revokedAt === null)).toBe(true);
      expect(
        await testDbClient(Tables.IdentityAccountDeletion).select(),
      ).toEqual([]);
    };

    it.each(['delete', 'DELET', '', 'DELETE it'])(
      'refuses the confirmation %p with DELETION_NOT_CONFIRMED (AC 9)',
      async (confirmation) => {
        const result = await deleteAccount(account.accessToken, confirmation);

        expect(reasonOf(result.body)).toBe('DELETION_NOT_CONFIRMED');
        await expectNothingChanged();
      },
    );

    it('refuses while an open order has not expired (AC 10)', async () => {
      await testDbClient(Tables.Order).insert(
        orderFactory.build({
          userId: account.userId,
          status: OrderStatus.PENDING,
          expiresAt: new Date(Date.now() + 10 * 60_000),
        }),
      );

      const result = await deleteAccount(account.accessToken);

      expect(reasonOf(result.body)).toBe('ACCOUNT_HAS_ACTIVE_ORDERS');
      await expectNothingChanged();
    });

    it('refuses while an issued ticket is for an upcoming event (AC 11)', async () => {
      const order = orderFactory.build({
        userId: account.userId,
        status: OrderStatus.PAID,
        eventStartAt: new Date(Date.now() + 7 * DAY),
      });
      const item = orderItemFactory.build({ orderId: order.id });
      await testDbClient(Tables.Order).insert(order);
      await testDbClient(Tables.OrderItem).insert(item);
      await testDbClient(Tables.Ticket).insert({
        ...ticketFactory.build({ userId: account.userId }),
        orderItemId: item.id,
      });

      const result = await deleteAccount(account.accessToken);

      expect(reasonOf(result.body)).toBe('ACCOUNT_HAS_ACTIVE_ORDERS');
      await expectNothingChanged();
    });

    it('does not block on an order past its expiry (edge case)', async () => {
      await testDbClient(Tables.Order).insert(
        orderFactory.build({
          userId: account.userId,
          status: OrderStatus.PENDING,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );

      const result = await deleteAccount(account.accessToken);

      expect(result.body.data.deleteMyAccount).toBe(true);
    });

    it('does not block on a used ticket for an upcoming event (edge case)', async () => {
      const order = orderFactory.build({
        userId: account.userId,
        status: OrderStatus.PAID,
        eventStartAt: new Date(Date.now() + 7 * DAY),
      });
      const item = orderItemFactory.build({ orderId: order.id });
      await testDbClient(Tables.Order).insert(order);
      await testDbClient(Tables.OrderItem).insert(item);
      await testDbClient(Tables.Ticket).insert({
        ...ticketFactory.build({
          userId: account.userId,
          status: TicketStatus.USED,
        }),
        orderItemId: item.id,
      });

      const result = await deleteAccount(account.accessToken);

      expect(result.body.data.deleteMyAccount).toBe(true);
    });

    it('refuses a request without an access token (AC 12)', async () => {
      const result = await gql(DELETE_MY_ACCOUNT, {
        input: { confirmation: 'DELETE' },
      });

      expect(codeOf(result.body)).toBe('UNAUTHENTICATED');
      await expectNothingChanged();
    });
  });

  describe('a deletion whose step fails', () => {
    it('returns true, keeps the deletion pending and refuses sign-in (PEND-01, PEND-02)', async () => {
      const account = await signUpAndVerify();
      await testDbClient(Tables.NotificationsNotification).insert(
        notificationFactory.build({ userId: account.userId }),
      );
      const notificationsEraser = module
        .get(DiscoveryService)
        .getProviders({ metadataKey: AccountErasure.KEY })
        .map((wrapper) => wrapper.instance as AccountEraser)
        .find((eraser) => eraser.name === 'notifications');
      jest
        .spyOn(notificationsEraser as AccountEraser, 'erase')
        .mockRejectedValueOnce(new Error('private notifications detail'));

      const result = await deleteAccount(account.accessToken);
      const login = await gql(LOG_IN, {
        input: { email: account.email, password: PASSWORD, rememberMe: false },
      });
      const [deletion] = await testDbClient(
        Tables.IdentityAccountDeletion,
      ).where({ userId: account.userId });

      expect(result.body.data.deleteMyAccount).toBe(true);
      expect(deletion.completedAt).toBeNull();
      expect(reasonOf(login.body)).toBe('INVALID_CREDENTIALS');
      expect(
        await testDbClient(Tables.NotificationsNotification).where({
          userId: account.userId,
        }),
      ).toHaveLength(2);
      expect(
        await testDbClient(Tables.IdentityUser).where({ id: account.userId }),
      ).toHaveLength(1);
    });
  });

  it('registers exactly the billing, notifications, ticketing and user-profile erasers', () => {
    const names = module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => (wrapper.instance as AccountEraser).name)
      .sort();

    expect(names).toEqual([
      'billing',
      'notifications',
      'ticketing',
      'user-profile',
    ]);
  });

  it('lets a demo visitor delete their account (edge case)', async () => {
    config.set('demo', { ...config.get('demo'), enabled: true });
    const demo = (await gql(DEMO_SIGN_IN)).body.data.demoSignIn;
    const userId = jwtService.verify(demo.accessToken).sub;

    const result = await deleteAccount(demo.accessToken, ' DELETE ');

    expect(result.body.data.deleteMyAccount).toBe(true);
    expect(
      await testDbClient(Tables.IdentityUser).where({ id: userId }),
    ).toEqual([]);
    expect(
      await testDbClient(Tables.UserProfileUser).where({ id: userId }),
    ).toEqual([]);
  });
});
