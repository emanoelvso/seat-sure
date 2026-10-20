import { randomUUID } from 'crypto';
import { DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { notificationFactory } from '@notificationsModule/__test__/factory/notifications-notification.factory';
import { MaintenanceModule } from '@src/maintenance.module';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { MaintenanceRunner } from '@sharedModules/maintenance/maintenance-runner.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const DATASOURCES = [
  'identity',
  'user-profile',
  'catalog',
  'ticketing',
  'billing',
  'notifications',
];

describe('MaintenanceModule (integration)', () => {
  let module: TestingModule;
  let runner: MaintenanceRunner;

  const clean = async () => {
    for (const table of [
      Tables.IdentityAccountDeletion,
      Tables.IdentityUser,
      Tables.NotificationsNotification,
    ]) {
      await testDbClient(table).del();
    }
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    // No GraphqlModule: the command boots without a schema or an HTTP server
    module = await Test.createTestingModule({
      imports: [MaintenanceModule],
    }).compile();
    runner = module.get(MaintenanceRunner);
  }, 60000);

  beforeEach(clean);

  afterAll(async () => {
    await clean();
    await testDbClient.destroy();
    for (const name of DATASOURCES) {
      const dataSource = module.get<DataSource>(getDataSourceToken(name));
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  });

  it('discovers the billing, notifications, ticketing and user-profile erasers', () => {
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

  it('finishes a pending account deletion and exits 0 with the simulated gateway', async () => {
    const userId = randomUUID();
    await testDbClient(Tables.IdentityUser).insert({
      id: userId,
      email: `ada-${userId}@example.com`,
      passwordHash: '$2b$10$'.padEnd(60, 'x'),
      emailVerifiedAt: new Date(),
    });
    await testDbClient(Tables.NotificationsNotification).insert(
      notificationFactory.build({ userId }),
    );
    await testDbClient(Tables.IdentityAccountDeletion).insert({
      id: randomUUID(),
      userId,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const exitCode = await runner.run(new Date());

    const [deletion] = await testDbClient(Tables.IdentityAccountDeletion).where(
      { userId },
    );
    expect(exitCode).toBe(0);
    expect(deletion.completedAt).not.toBeNull();
    expect(
      await testDbClient(Tables.IdentityUser).where({ id: userId }),
    ).toEqual([]);
    expect(
      await testDbClient(Tables.NotificationsNotification).where({ userId }),
    ).toEqual([]);
  });
});
