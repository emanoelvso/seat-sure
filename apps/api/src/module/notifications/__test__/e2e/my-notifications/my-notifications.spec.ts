import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { notificationFactory } from '@notificationsModule/__test__/factory/notifications-notification.factory';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

const MY_NOTIFICATIONS = `
  query MyNotifications($input: MyNotificationsInput!) {
    myNotifications(input: $input) {
      items {
        id
        type
        eventName
        createdAt
        readAt
      }
      counts {
        all
        unread
        read
      }
      page
      totalPages
    }
  }
`;

type Input = { tab?: string; page: number; pageSize: number };

describe('NotificationsResolver myNotifications (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  const at = (iso: string) => new Date(iso);
  const ids = (body: {
    data: { myNotifications: { items: { id: string }[] } };
  }) => body.data.myNotifications.items.map((item) => item.id);

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([NotificationsModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.NotificationsNotification).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.NotificationsNotification).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(
      getDataSourceToken('notifications'),
    );
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const myNotifications = async (input: Input, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: MY_NOTIFICATIONS, variables: { input } })
      .expect(200);
    return response.body;
  };

  it('returns the caller items with their fields, the counts, page, and totalPages (View AC 3, 5, 6)', async () => {
    const welcome = notificationFactory.build({
      userId,
      type: 'welcome',
      payload: {},
      createdAt: at('2026-10-01T10:00:00Z'),
    });
    const purchase = notificationFactory.build({
      userId,
      type: 'purchase_confirmed',
      payload: { eventName: 'Rock in Rio' },
      readAt: at('2026-10-02T12:00:00Z'),
      createdAt: at('2026-10-02T10:00:00Z'),
    });
    const declined = notificationFactory.build({
      userId,
      type: 'payment_unsuccessful',
      payload: { eventName: 'Lollapalooza' },
      createdAt: at('2026-10-03T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert([
      welcome,
      purchase,
      declined,
    ]);

    const body = await myNotifications(
      { tab: 'ALL', page: 1, pageSize: 10 },
      tokenFor(userId),
    );

    expect(body.errors).toBeUndefined();
    expect(body.data.myNotifications).toEqual({
      items: [
        {
          id: declined.id,
          type: 'PAYMENT_UNSUCCESSFUL',
          eventName: 'Lollapalooza',
          createdAt: '2026-10-03T10:00:00.000Z',
          readAt: null,
        },
        {
          id: purchase.id,
          type: 'PURCHASE_CONFIRMED',
          eventName: 'Rock in Rio',
          createdAt: '2026-10-02T10:00:00.000Z',
          readAt: '2026-10-02T12:00:00.000Z',
        },
        {
          id: welcome.id,
          type: 'WELCOME',
          eventName: null,
          createdAt: '2026-10-01T10:00:00.000Z',
          readAt: null,
        },
      ],
      counts: { all: 3, unread: 2, read: 1 },
      page: 1,
      totalPages: 1,
    });
  });

  it('defaults the tab to ALL when none is given (View AC 4)', async () => {
    await testDbClient(Tables.NotificationsNotification).insert([
      notificationFactory.build({ userId }),
      notificationFactory.build({ userId, readAt: at('2026-10-02T00:00:00Z') }),
    ]);

    const body = await myNotifications(
      { page: 1, pageSize: 10 },
      tokenFor(userId),
    );

    expect(body.data.myNotifications.items).toHaveLength(2);
  });

  it('filters by tab: UNREAD lists no read time, READ lists a read time, counts stay whole (View AC 5)', async () => {
    const unread = notificationFactory.build({
      userId,
      createdAt: at('2026-10-01T10:00:00Z'),
    });
    const read = notificationFactory.build({
      userId,
      readAt: at('2026-10-02T00:00:00Z'),
      createdAt: at('2026-10-02T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert([unread, read]);

    const unreadBody = await myNotifications(
      { tab: 'UNREAD', page: 1, pageSize: 10 },
      tokenFor(userId),
    );
    const readBody = await myNotifications(
      { tab: 'READ', page: 1, pageSize: 10 },
      tokenFor(userId),
    );

    expect(ids(unreadBody)).toEqual([unread.id]);
    expect(unreadBody.data.myNotifications.counts).toEqual({
      all: 2,
      unread: 1,
      read: 1,
    });
    expect(ids(readBody)).toEqual([read.id]);
    expect(readBody.data.myNotifications.counts).toEqual({
      all: 2,
      unread: 1,
      read: 1,
    });
  });

  it('orders newest first, ties broken by id descending (View AC 6)', async () => {
    const sameTime = at('2026-10-03T10:00:00Z');
    const rows = [
      notificationFactory.build({
        id: '00000000-0000-4000-8000-000000000001',
        userId,
        createdAt: sameTime,
      }),
      notificationFactory.build({
        id: '00000000-0000-4000-8000-000000000002',
        userId,
        createdAt: sameTime,
      }),
      notificationFactory.build({
        id: '00000000-0000-4000-8000-000000000003',
        userId,
        createdAt: at('2026-10-04T10:00:00Z'),
      }),
    ];
    await testDbClient(Tables.NotificationsNotification).insert(rows);

    const body = await myNotifications(
      { page: 1, pageSize: 10 },
      tokenFor(userId),
    );

    expect(ids(body)).toEqual([rows[2].id, rows[1].id, rows[0].id]);
  });

  describe('paging', () => {
    beforeEach(async () => {
      await testDbClient(Tables.NotificationsNotification).insert(
        Array.from({ length: 12 }, (_, index) =>
          notificationFactory.build({
            userId,
            createdAt: new Date(Date.UTC(2026, 9, 1, index)),
          }),
        ),
      );
    });

    it('serves 10 on page 1 and 2 on page 2 of 2 (View AC 7, 8)', async () => {
      const first = await myNotifications(
        { tab: 'ALL', page: 1, pageSize: 10 },
        tokenFor(userId),
      );
      const second = await myNotifications(
        { tab: 'ALL', page: 2, pageSize: 10 },
        tokenFor(userId),
      );

      expect(first.data.myNotifications.items).toHaveLength(10);
      expect(first.data.myNotifications.totalPages).toBe(2);
      expect(second.data.myNotifications.items).toHaveLength(2);
      expect(second.data.myNotifications.page).toBe(2);
      expect(second.data.myNotifications.totalPages).toBe(2);
    });

    it('serves page 1 when the page is past the end (View AC 9)', async () => {
      const body = await myNotifications(
        { tab: 'ALL', page: 3, pageSize: 10 },
        tokenFor(userId),
      );

      expect(body.data.myNotifications.page).toBe(1);
      expect(body.data.myNotifications.items).toHaveLength(10);
    });
  });

  it('returns 0 totalPages and no items for an empty tab', async () => {
    await testDbClient(Tables.NotificationsNotification).insert(
      notificationFactory.build({ userId }),
    );

    const body = await myNotifications(
      { tab: 'READ', page: 1, pageSize: 10 },
      tokenFor(userId),
    );

    expect(body.data.myNotifications).toMatchObject({
      items: [],
      page: 1,
      totalPages: 0,
    });
  });

  it("never returns another user's notifications: each token sees its own (View AC 19)", async () => {
    const mine = notificationFactory.build({ userId });
    const theirs = notificationFactory.build({ userId: otherUserId });
    await testDbClient(Tables.NotificationsNotification).insert([mine, theirs]);

    const myBody = await myNotifications(
      { page: 1, pageSize: 10 },
      tokenFor(userId),
    );
    const theirBody = await myNotifications(
      { page: 1, pageSize: 10 },
      tokenFor(otherUserId),
    );

    expect(ids(myBody)).toEqual([mine.id]);
    expect(myBody.data.myNotifications.counts.all).toBe(1);
    expect(ids(theirBody)).toEqual([theirs.id]);
  });

  describe('input validation', () => {
    it.each([
      ['page 0', { page: 0, pageSize: 10 }],
      ['pageSize 0', { page: 1, pageSize: 0 }],
      ['pageSize 51', { page: 1, pageSize: 51 }],
    ])(
      'rejects %s with INVALID_PAGE (422, BAD_USER_INPUT)',
      async (_, input) => {
        const body = await myNotifications(input, tokenFor(userId));

        expect(body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
        expect(body.errors[0].extensions.originalError.reason).toBe(
          'INVALID_PAGE',
        );
        expect(body.data).toBeNull();
      },
    );
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    const body = await myNotifications({ page: 1, pageSize: 10 });

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
  });
});
