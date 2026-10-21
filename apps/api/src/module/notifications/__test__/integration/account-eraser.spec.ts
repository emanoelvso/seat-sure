import { randomUUID } from 'crypto';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { notificationFactory } from '@notificationsModule/__test__/factory/notifications-notification.factory';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { AccountErasure } from '@sharedModules/integration/interface/account-erasure.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('NotificationsAccountEraser (integration)', () => {
  let module: TestingModule;

  const erasers = () =>
    module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => wrapper.instance as Record<string, unknown>);

  const eraser = () =>
    erasers().find((found) => found.name === 'notifications') as {
      erase(userId: string): Promise<void>;
    };

  const notificationsOf = (userId: string) =>
    testDbClient(Tables.NotificationsNotification).where({ userId });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [NotificationsModule, DiscoveryModule],
    }).compile();
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
  });

  it('is discovered exactly once, named notifications, with no blocker check (DEL-06)', () => {
    const found = erasers().filter((item) => item.name === 'notifications');

    expect(found).toHaveLength(1);
    expect(found[0].findBlocker).toBeUndefined();
  });

  it("deletes all of the user's read and unread notifications and keeps another user's (DEL-06)", async () => {
    const userId = randomUUID();
    const otherId = randomUUID();
    await testDbClient(Tables.NotificationsNotification).insert([
      notificationFactory.build({ userId, readAt: null }),
      notificationFactory.build({ userId, readAt: new Date() }),
      notificationFactory.build({ userId: otherId }),
    ]);

    await eraser().erase(userId);

    expect(await notificationsOf(userId)).toEqual([]);
    expect(await notificationsOf(otherId)).toHaveLength(1);
  });

  it('succeeds when erased twice and when the user has none (PEND-01 idempotence)', async () => {
    const userId = randomUUID();
    await testDbClient(Tables.NotificationsNotification).insert(
      notificationFactory.build({ userId }),
    );

    await eraser().erase(userId);
    await expect(eraser().erase(userId)).resolves.toBeUndefined();
    await expect(eraser().erase(randomUUID())).resolves.toBeUndefined();
  });
});
