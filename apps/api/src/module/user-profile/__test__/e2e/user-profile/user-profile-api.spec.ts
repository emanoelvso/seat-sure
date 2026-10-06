import { randomUUID } from 'crypto';
import { INestApplication, Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import { DataSource } from 'typeorm';

// A trivial Query root is required by Nest's code-first GraphQL schema
// builder; UserProfileModule has no resolver of its own (SPEC_DEVIATION, same
// as catalog/__test__/e2e/catalog/transactional.spec.ts).
@Resolver()
class UserProfileProbeResolver {
  @Query(() => Boolean)
  userProfileProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({ providers: [UserProfileProbeResolver] })
class UserProfileProbeModule {}

describe('UserProfileApi (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userProfileApi: UserProfileApi;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([
      UserProfileModule,
      UserProfileProbeModule,
    ]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    userProfileApi = module.get<UserProfileApi>(UserProfileApi);
  });

  beforeEach(async () => {
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(
      getDataSourceToken('user-profile'),
    );
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('stores a row with the given id, first name and last name, and null avatarUrl and personal info columns', async () => {
    const userId = randomUUID();

    await userProfileApi.createProfile({
      userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
    });

    const stored = await testDbClient(Tables.UserProfileUser)
      .where({ id: userId })
      .first();
    expect(stored.id).toBe(userId);
    expect(stored.firstName).toBe('Negar');
    expect(stored.lastName).toBe('Khosravi');
    expect(stored.avatarUrl).toBeNull();
    expect(stored.state).toBeNull();
    expect(stored.city).toBeNull();
    expect(stored.birthDate).toBeNull();
    expect(stored.phoneCountryCode).toBeNull();
    expect(stored.phoneNumber).toBeNull();
    expect(stored.zipCode).toBeNull();
  });

  it('finds a stored profile by id', async () => {
    const userId = randomUUID();
    await userProfileApi.createProfile({
      userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
    });

    const found = await userProfileApi.findProfile(userId);

    expect(found).toEqual({
      id: userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
      avatarUrl: null,
    });
  });

  it('returns null for an unknown id', async () => {
    const found = await userProfileApi.findProfile(randomUUID());

    expect(found).toBeNull();
  });

  it('rejects a second createProfile with the same id', async () => {
    const userId = randomUUID();
    await userProfileApi.createProfile({
      userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
    });

    await expect(
      userProfileApi.createProfile({
        userId,
        firstName: 'Omid',
        lastName: 'Rahimi',
      }),
    ).rejects.toThrow();
  });
});
