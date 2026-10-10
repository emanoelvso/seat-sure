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

const MARK_ALL_NOTIFICATIONS_READ = `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead {
      all
      unread
      read
    }
  }
`;

describe('NotificationsResolver markAllNotificationsRead (e2e)', () => {
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

  const markAllRead = async (token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: MARK_ALL_NOTIFICATIONS_READ })
      .expect(200);
    return response.body;
  };

  const storedReadAt = async (id: string) => {
    const row = await testDbClient(Tables.NotificationsNotification)
      .where({ id })
      .first();
    return row.readAt ? new Date(row.readAt).toISOString() : null;
  };

  it('marks every unread notification read and returns the new counts (Mark all AC 4)', async () => {
    const unread = [1, 2, 3].map((day) =>
      notificationFactory.build({
        userId,
        createdAt: new Date(`2026-10-0${day}T10:00:00Z`),
      }),
    );
    const read = [4, 5].map((day) =>
      notificationFactory.build({
        userId,
        readAt: new Date(`2026-10-0${day}T12:00:00Z`),
        createdAt: new Date(`2026-10-0${day}T10:00:00Z`),
      }),
    );
    await testDbClient(Tables.NotificationsNotification).insert([
      ...unread,
      ...read,
    ]);

    const body = await markAllRead(tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.markAllNotificationsRead).toEqual({
      all: 5,
      unread: 0,
      read: 5,
    });
    for (const row of unread) {
      expect(await storedReadAt(row.id)).not.toBeNull();
    }
  });

  it('keeps the read time of notifications that were already read', async () => {
    const read = notificationFactory.build({
      userId,
      readAt: new Date('2026-10-04T12:00:00Z'),
      createdAt: new Date('2026-10-04T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert([
      read,
      notificationFactory.build({
        userId,
        createdAt: new Date('2026-10-01T10:00:00Z'),
      }),
    ]);

    await markAllRead(tokenFor(userId));

    expect(await storedReadAt(read.id)).toBe('2026-10-04T12:00:00.000Z');
  });

  it("leaves another user's unread notifications unread (Mark all AC 7)", async () => {
    const theirs = notificationFactory.build({
      userId: otherUserId,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert([
      theirs,
      notificationFactory.build({
        userId,
        createdAt: new Date('2026-10-01T10:00:00Z'),
      }),
    ]);

    const body = await markAllRead(tokenFor(userId));

    expect(body.data.markAllNotificationsRead).toEqual({
      all: 1,
      unread: 0,
      read: 1,
    });
    expect(await storedReadAt(theirs.id)).toBeNull();
  });

  it('leaves a notification created after the request unread (Mark all AC 6)', async () => {
    const existing = notificationFactory.build({
      userId,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    const afterRequest = notificationFactory.build({
      userId,
      createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await testDbClient(Tables.NotificationsNotification).insert([
      existing,
      afterRequest,
    ]);

    const body = await markAllRead(tokenFor(userId));

    expect(body.data.markAllNotificationsRead).toEqual({
      all: 2,
      unread: 1,
      read: 1,
    });
    expect(await storedReadAt(existing.id)).not.toBeNull();
    expect(await storedReadAt(afterRequest.id)).toBeNull();
  });

  it('responds UNAUTHENTICATED without a token and changes nothing', async () => {
    const row = notificationFactory.build({
      userId,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    await testDbClient(Tables.NotificationsNotification).insert(row);

    const body = await markAllRead();

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    expect(await storedReadAt(row.id)).toBeNull();
  });
});
