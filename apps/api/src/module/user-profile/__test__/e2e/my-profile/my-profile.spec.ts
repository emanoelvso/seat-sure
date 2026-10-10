import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import request from 'supertest';
import { DataSource } from 'typeorm';

const MY_PROFILE = `
  query MyProfile {
    myProfile {
      id
      firstName
      lastName
      avatarUrl
      state
      city
      birthDate
      phoneCountryCode
      phoneNumber
      zipCode
    }
  }
`;

describe('UserProfileResolver myProfile (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  const FULL_ROW = {
    id: userId,
    firstName: 'Negar',
    lastName: 'Khosravi',
    avatarUrl: 'https://example.com/negar.png',
    state: 'California',
    city: 'San Francisco',
    birthDate: '1995-08-17',
    phoneCountryCode: '+49',
    phoneNumber: '558855488',
    zipCode: '94105',
  };

  const OTHER_ROW = {
    id: otherUserId,
    firstName: 'Omid',
    lastName: 'Rahimi',
    avatarUrl: null,
    state: 'Bavaria',
    city: 'Munich',
    birthDate: '1980-01-02',
    phoneCountryCode: '+34',
    phoneNumber: '600111222',
    zipCode: '80331',
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([UserProfileModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
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

  const tokenFor = (id: string) =>
    jwtService.sign({
      sub: id,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

  const myProfile = async (token?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call.send({ query: MY_PROFILE }).expect(200);
    return response.body;
  };

  it('returns every field of the caller profile, birthDate as YYYY-MM-DD (PROFILE-01)', async () => {
    await testDbClient(Tables.UserProfileUser).insert(FULL_ROW);

    const body = await myProfile(tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.myProfile).toEqual(FULL_ROW);
  });

  it('returns null for every unset optional field', async () => {
    await testDbClient(Tables.UserProfileUser).insert({
      id: userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
    });

    const body = await myProfile(tokenFor(userId));

    expect(body.data.myProfile).toEqual({
      id: userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
      avatarUrl: null,
      state: null,
      city: null,
      birthDate: null,
      phoneCountryCode: null,
      phoneNumber: null,
      zipCode: null,
    });
  });

  it('never returns another user row: each token sees its own profile (PROFILE-02)', async () => {
    await testDbClient(Tables.UserProfileUser).insert([FULL_ROW, OTHER_ROW]);

    const mine = await myProfile(tokenFor(userId));
    const theirs = await myProfile(tokenFor(otherUserId));

    expect(mine.data.myProfile).toEqual(FULL_ROW);
    expect(theirs.data.myProfile).toEqual(OTHER_ROW);
  });

  it('does not expose another user row when the caller has none', async () => {
    await testDbClient(Tables.UserProfileUser).insert(OTHER_ROW);

    const body = await myProfile(tokenFor(userId));

    expect(body.data).toBeNull();
    expect(JSON.stringify(body)).not.toContain('Omid');
  });

  it('responds UNAUTHENTICATED without a token', async () => {
    await testDbClient(Tables.UserProfileUser).insert(FULL_ROW);

    const body = await myProfile();

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
  });

  it('responds UNAUTHENTICATED with an invalid token', async () => {
    await testDbClient(Tables.UserProfileUser).insert(FULL_ROW);

    const body = await myProfile('not-a-token');

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
  });

  it('responds UNAUTHENTICATED with an expired token', async () => {
    await testDbClient(Tables.UserProfileUser).insert(FULL_ROW);
    const expired = jwtService.sign({
      sub: userId,
      sid: randomUUID(),
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    const body = await myProfile(expired);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('fails with reason PROFILE_NOT_FOUND when the caller has no profile row', async () => {
    const body = await myProfile(tokenFor(userId));

    expect(body.data).toBeNull();
    expect(body.errors[0].extensions.originalError.reason).toBe(
      'PROFILE_NOT_FOUND',
    );
  });
});
