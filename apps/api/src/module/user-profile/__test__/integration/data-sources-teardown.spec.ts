import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { destroyDataSources } from '@testInfra/data-sources.teardown';
import { testDbClient } from '@testInfra/knex.database';
import { UserProfilePersistenceModule } from '@userProfileModule/persistence/user-profile-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('destroyDataSources (integration)', () => {
  let module: TestingModule;

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [UserProfilePersistenceModule],
    }).compile();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    await destroyDataSources(module);
  });

  it('closes the module data source and ignores the sources the module lacks', async () => {
    const dataSource = module.get<DataSource>(
      getDataSourceToken('user-profile'),
    );
    expect(dataSource.isInitialized).toBe(true);

    await destroyDataSources(module);

    expect(dataSource.isInitialized).toBe(false);
  });

  it('does not throw when called a second time', async () => {
    await expect(destroyDataSources(module)).resolves.toBeUndefined();
  });
});
