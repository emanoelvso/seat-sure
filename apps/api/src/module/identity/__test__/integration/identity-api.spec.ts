import { randomUUID } from 'crypto';
import { IdentityModule } from '@identityModule/identity.module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { IdentityApi } from '@sharedModules/integration/interface/identity-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { destroyDataSources } from '@testInfra/data-sources.teardown';
import { createNestApp } from '@testInfra/test-e2e.setup';

describe('IdentityPublicApiProvider.findAccountEmail (integration)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let identityApi: IdentityApi;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([IdentityModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    identityApi = module.get<IdentityApi>(IdentityApi);
  });

  afterAll(async () => {
    await testDbClient(Tables.IdentityUser).del();
    await testDbClient.destroy();
    await destroyDataSources(module);
    await app.getHttpServer().close();
  });

  it("returns the user's email for a known user id (PAY-39)", async () => {
    const id = randomUUID();
    const email = `account-${id}@example.com`;
    await testDbClient.batchInsert(Tables.IdentityUser, [
      { id, email, passwordHash: 'x'.repeat(60) },
    ]);

    const result = await identityApi.findAccountEmail(id);

    expect(result).toBe(email);
  });

  it('returns null for an unknown user id', async () => {
    const result = await identityApi.findAccountEmail(randomUUID());

    expect(result).toBeNull();
  });

  it('returns null, without throwing, for a non-UUID string', async () => {
    const result = await identityApi.findAccountEmail('not-a-uuid');

    expect(result).toBeNull();
  });
});
