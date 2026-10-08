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

const MARK_NOTIFICATION_READ = `
  mutation MarkNotificationRead($input: NotificationIdInput!) {
    markNotificationRead(input: $input) {
      id
      type
      eventName
      createdAt
      readAt
    }
  }
`;

describe('NotificationsResolver markNotificationRead (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();

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

  const markRead = async (id: string, token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: MARK_NOTIFICATION_READ, variables: { input: { id } } })
      .expect(200);
    return response.body;
  };

  const storedReadAt = async (id: string) => {
    const row = await testDbClient(Tables.NotificationsNotification)
      .where({ id })
      .first();
    return row.readAt ? new Date(row.readAt).toISOString() : null;
  };

  it('marks an unread notification read and returns it with its read time (Read AC 4)', async () => {
    const row = notificationFactory.build({
      userId,
      type: 'purchase_confirmed',
      payload: { eventName: 'Rock in Rio' },
      createdAt: new Date('2026-10-02T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert(row);
    const before = Date.now();

    const body = await markRead(row.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.markNotificationRead).toMatchObject({
      id: row.id,
      type: 'PURCHASE_CONFIRMED',
      eventName: 'Rock in Rio',
      createdAt: '2026-10-02T10:00:00.000Z',
    });
    const returnedReadAt = Date.parse(body.data.markNotificationRead.readAt);
    expect(returnedReadAt).toBeGreaterThanOrEqual(before);
    expect(returnedReadAt).toBeLessThanOrEqual(Date.now());
    expect(await storedReadAt(row.id)).toBe(
      body.data.markNotificationRead.readAt,
    );
  });

  it('keeps the first read time when it is already read (Read AC 9)', async () => {
    const row = notificationFactory.build({
      userId,
      readAt: new Date('2026-10-03T12:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert(row);

    const body = await markRead(row.id, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.markNotificationRead.readAt).toBe(
      '2026-10-03T12:00:00.000Z',
    );
    expect(await storedReadAt(row.id)).toBe('2026-10-03T12:00:00.000Z');
  });

  it("rejects another user's id with NOTIFICATION_NOT_FOUND and changes nothing (Read AC 8)", async () => {
    const theirs = notificationFactory.build({ userId: otherUserId });
    await testDbClient(Tables.NotificationsNotification).insert(theirs);

    const body = await markRead(theirs.id, tokenFor(userId));

    expect(body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(body.errors[0].extensions.originalError.reason).toBe(
      'NOTIFICATION_NOT_FOUND',
    );
    expect(body.data).toBeNull();
    expect(await storedReadAt(theirs.id)).toBeNull();
  });

  it.each([
    ['a missing uuid', randomUUID()],
    ['a malformed id', 'not-a-uuid'],
  ])('rejects %s with NOTIFICATION_NOT_FOUND (Read AC 8)', async (_, id) => {
    const mine = notificationFactory.build({ userId });
    await testDbClient(Tables.NotificationsNotification).insert(mine);

    const body = await markRead(id, tokenFor(userId));

    expect(body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(body.errors[0].extensions.originalError.reason).toBe(
      'NOTIFICATION_NOT_FOUND',
    );
    expect(body.data).toBeNull();
    expect(await storedReadAt(mine.id)).toBeNull();
  });

  it('responds UNAUTHENTICATED without a token and changes nothing', async () => {
    const row = notificationFactory.build({ userId });
    await testDbClient(Tables.NotificationsNotification).insert(row);

    const body = await markRead(row.id);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    expect(await storedReadAt(row.id)).toBeNull();
  });
});
