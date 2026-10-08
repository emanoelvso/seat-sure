import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { notificationFactory } from '@notificationsModule/__test__/factory/notifications-notification.factory';
import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import { NotificationsNotification } from '@notificationsModule/persistence/entity/notifications-notification.entity';
import { NotificationsPersistenceModule } from '@notificationsModule/persistence/notifications-persistence.module';
import { NotificationRepository } from '@notificationsModule/persistence/repository/notification.repository';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('NotificationRepository (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let repository: NotificationRepository;

  const at = (iso: string) => new Date(iso);

  const entity = (data: Partial<NotificationsNotification> = {}) =>
    new NotificationsNotification({
      userId: randomUUID(),
      type: NotificationType.WELCOME,
      channel: 'in_app',
      sourceId: randomUUID(),
      payload: {},
      readAt: null,
      createdAt: at('2026-10-01T10:00:00Z'),
      ...data,
    });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [NotificationsPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('notifications'));
    repository = module.get(NotificationRepository);
  });

  beforeEach(async () => {
    await testDbClient(Tables.NotificationsNotification).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.NotificationsNotification).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('insertIgnoringDuplicate', () => {
    it('stores the row with its columns and a null readAt (NOTIF-01 AC 9)', async () => {
      const userId = randomUUID();
      const sourceId = randomUUID();

      await repository.insertIgnoringDuplicate(
        entity({
          userId,
          type: NotificationType.PURCHASE_CONFIRMED,
          sourceId,
          payload: { eventName: 'Rock in Rio' },
        }),
      );

      const rows = await testDbClient(Tables.NotificationsNotification).where({
        userId,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        userId,
        type: 'purchase_confirmed',
        channel: 'in_app',
        sourceId,
        payload: { eventName: 'Rock in Rio' },
        readAt: null,
      });
    });

    it('leaves one row and does not throw on a repeated (userId, type, sourceId) (NOTIF-02 AC 4)', async () => {
      const userId = randomUUID();
      const sourceId = randomUUID();
      const build = () =>
        entity({
          userId,
          type: NotificationType.PURCHASE_CONFIRMED,
          sourceId,
        });

      await repository.insertIgnoringDuplicate(build());
      await expect(
        repository.insertIgnoringDuplicate(build()),
      ).resolves.toBeUndefined();

      const rows = await testDbClient(Tables.NotificationsNotification).where({
        userId,
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('countTabs', () => {
    it('counts all, unread, and read for one user only (NOTIF-06 AC 3)', async () => {
      const userId = randomUUID();
      await testDbClient(Tables.NotificationsNotification).insert([
        notificationFactory.build({ userId }),
        notificationFactory.build({ userId }),
        notificationFactory.build({
          userId,
          readAt: at('2026-10-02T00:00:00Z'),
        }),
        notificationFactory.build({ readAt: null }),
        notificationFactory.build({ readAt: at('2026-10-02T00:00:00Z') }),
      ]);

      await expect(repository.countTabs(userId)).resolves.toEqual({
        all: 3,
        unread: 2,
        read: 1,
      });
    });

    it('returns zeros for a user with none', async () => {
      await expect(repository.countTabs(randomUUID())).resolves.toEqual({
        all: 0,
        unread: 0,
        read: 0,
      });
    });
  });

  describe('findPage', () => {
    it('orders newest first, ties broken by id descending (View AC 6)', async () => {
      const userId = randomUUID();
      const sameTime = at('2026-10-03T10:00:00Z');
      await testDbClient(Tables.NotificationsNotification).insert([
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
        notificationFactory.build({
          id: '00000000-0000-4000-8000-000000000004',
          userId,
          createdAt: at('2026-10-01T10:00:00Z'),
        }),
      ]);

      const rows = await repository.findPage(userId, 'all', {
        offset: 0,
        limit: 10,
      });

      expect(rows.map((r) => r.id)).toEqual([
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000004',
      ]);
    });

    it('filters all, unread, and read (View AC 5)', async () => {
      const userId = randomUUID();
      const unread = notificationFactory.build({
        userId,
        createdAt: at('2026-10-01T10:00:00Z'),
      });
      const read = notificationFactory.build({
        userId,
        readAt: at('2026-10-02T00:00:00Z'),
        createdAt: at('2026-10-02T10:00:00Z'),
      });
      await testDbClient(Tables.NotificationsNotification).insert([
        unread,
        read,
      ]);
      const page = { offset: 0, limit: 10 };

      const all = await repository.findPage(userId, 'all', page);
      const onlyUnread = await repository.findPage(userId, 'unread', page);
      const onlyRead = await repository.findPage(userId, 'read', page);

      expect(all.map((r) => r.id)).toEqual([read.id, unread.id]);
      expect(onlyUnread.map((r) => r.id)).toEqual([unread.id]);
      expect(onlyRead.map((r) => r.id)).toEqual([read.id]);
    });

    it('honours offset and limit (View AC 7)', async () => {
      const userId = randomUUID();
      const rows = [1, 2, 3, 4, 5].map((day) =>
        notificationFactory.build({
          userId,
          createdAt: at(`2026-10-0${day}T10:00:00Z`),
        }),
      );
      await testDbClient(Tables.NotificationsNotification).insert(rows);

      const page = await repository.findPage(userId, 'all', {
        offset: 1,
        limit: 2,
      });

      expect(page.map((r) => r.id)).toEqual([rows[3].id, rows[2].id]);
    });

    it("never returns another user's rows (View AC 19)", async () => {
      const userId = randomUUID();
      const mine = notificationFactory.build({ userId });
      await testDbClient(Tables.NotificationsNotification).insert([
        mine,
        notificationFactory.build(),
      ]);

      const rows = await repository.findPage(userId, 'all', {
        offset: 0,
        limit: 10,
      });

      expect(rows.map((r) => r.id)).toEqual([mine.id]);
    });
  });

  describe('markRead', () => {
    it('sets readAt once and keeps the first value on a second call (Read AC 9)', async () => {
      const userId = randomUUID();
      const row = notificationFactory.build({ userId });
      await testDbClient(Tables.NotificationsNotification).insert(row);
      const first = at('2026-10-05T10:00:00Z');
      const second = at('2026-10-06T10:00:00Z');

      const afterFirst = await repository.markRead(userId, row.id, first);
      const afterSecond = await repository.markRead(userId, row.id, second);

      expect(afterFirst?.readAt?.toISOString()).toBe(first.toISOString());
      expect(afterSecond?.readAt?.toISOString()).toBe(first.toISOString());
      const stored = await testDbClient(Tables.NotificationsNotification)
        .where({ id: row.id })
        .first();
      expect(new Date(stored.readAt).toISOString()).toBe(first.toISOString());
    });

    it('returns null and changes nothing for a foreign id (Read AC 8)', async () => {
      const row = notificationFactory.build();
      await testDbClient(Tables.NotificationsNotification).insert(row);

      const result = await repository.markRead(
        randomUUID(),
        row.id,
        at('2026-10-05T10:00:00Z'),
      );

      expect(result).toBeNull();
      const stored = await testDbClient(Tables.NotificationsNotification)
        .where({ id: row.id })
        .first();
      expect(stored.readAt).toBeNull();
    });

    it('returns null for a missing id (Read AC 8)', async () => {
      const result = await repository.markRead(
        randomUUID(),
        randomUUID(),
        at('2026-10-05T10:00:00Z'),
      );

      expect(result).toBeNull();
    });
  });

  describe('markAllRead', () => {
    it("marks only that user's unread rows created at or before now (Mark all AC 4, 6, 7)", async () => {
      const userId = randomUUID();
      const now = at('2026-10-05T10:00:00Z');
      const existing = notificationFactory.build({
        userId,
        createdAt: at('2026-10-05T09:00:00Z'),
      });
      const atNow = notificationFactory.build({ userId, createdAt: now });
      const later = notificationFactory.build({
        userId,
        createdAt: at('2026-10-05T10:00:01Z'),
      });
      const alreadyRead = notificationFactory.build({
        userId,
        readAt: at('2026-10-04T00:00:00Z'),
        createdAt: at('2026-10-03T09:00:00Z'),
      });
      const foreign = notificationFactory.build({
        createdAt: at('2026-10-05T09:00:00Z'),
      });
      await testDbClient(Tables.NotificationsNotification).insert([
        existing,
        atNow,
        later,
        alreadyRead,
        foreign,
      ]);

      await repository.markAllRead(userId, now);

      const readAtOf = async (id: string) => {
        const row = await testDbClient(Tables.NotificationsNotification)
          .where({ id })
          .first();
        return row.readAt ? new Date(row.readAt).toISOString() : null;
      };
      expect(await readAtOf(existing.id)).toBe(now.toISOString());
      expect(await readAtOf(atNow.id)).toBe(now.toISOString());
      expect(await readAtOf(later.id)).toBeNull();
      expect(await readAtOf(alreadyRead.id)).toBe('2026-10-04T00:00:00.000Z');
      expect(await readAtOf(foreign.id)).toBeNull();
    });
  });
});
