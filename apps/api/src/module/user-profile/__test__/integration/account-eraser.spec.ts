import { randomUUID } from 'crypto';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AccountErasure } from '@sharedModules/integration/interface/account-erasure.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('UserProfileAccountEraser (integration)', () => {
  let module: TestingModule;

  const erasers = () =>
    module
      .get(DiscoveryService)
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => wrapper.instance as Record<string, unknown>);

  const eraser = () =>
    erasers().find((found) => found.name === 'user-profile') as {
      erase(userId: string): Promise<void>;
    };

  const seedProfile = async (id = randomUUID(), deletedAt?: Date) => {
    await testDbClient(Tables.UserProfileUser).insert({
      id,
      firstName: 'Negar',
      lastName: 'Khosravi',
      deletedAt: deletedAt ?? null,
    });
    return id;
  };

  const profileRows = (id: string) =>
    testDbClient(Tables.UserProfileUser).where({ id });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [UserProfileModule, DiscoveryModule],
    }).compile();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(
      getDataSourceToken('user-profile'),
    );
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('is discovered exactly once, named user-profile, with no blocker check (DEL-05)', () => {
    const found = erasers().filter((item) => item.name === 'user-profile');

    expect(found).toHaveLength(1);
    expect(found[0].findBlocker).toBeUndefined();
  });

  it("hard-deletes the user's profile row and keeps another user's (DEL-05)", async () => {
    const userId = await seedProfile();
    const otherId = await seedProfile();

    await eraser().erase(userId);

    expect(await profileRows(userId)).toEqual([]);
    expect(await profileRows(otherId)).toHaveLength(1);
    await profileRows(otherId).del();
  });

  it('hard-deletes a soft-deleted profile row too (DEL-05)', async () => {
    const userId = await seedProfile(randomUUID(), new Date());

    await eraser().erase(userId);

    expect(await profileRows(userId)).toEqual([]);
  });

  it('succeeds when erased twice and when the user has no profile (PEND-01 idempotence)', async () => {
    const userId = await seedProfile();

    await eraser().erase(userId);
    await expect(eraser().erase(userId)).resolves.toBeUndefined();
    await expect(eraser().erase(randomUUID())).resolves.toBeUndefined();
  });
});
