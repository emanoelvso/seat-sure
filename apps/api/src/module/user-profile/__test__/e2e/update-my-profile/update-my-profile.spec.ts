import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { UserProfileService } from '@userProfileModule/core/service/user-profile.service';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import request from 'supertest';
import { DataSource } from 'typeorm';

const UPDATE_MY_PROFILE = `
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
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

const VALID_INPUT = {
  firstName: 'Sara',
  lastName: 'Ahmadi',
  state: 'California',
  city: 'San Francisco',
  birthDate: '1995-08-17',
  phoneCountryCode: '+49',
  phoneNumber: '558855488',
  zipCode: '94105',
};

describe('UserProfileResolver updateMyProfile (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwtService: JwtService;
  let configService: ConfigService;
  let userProfileService: UserProfileService;

  const originalTimeZone = process.env.APP_TIME_ZONE;
  const userId = randomUUID();
  const otherUserId = randomUUID();

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

  const insertCaller = (overrides: Record<string, unknown> = {}) =>
    testDbClient(Tables.UserProfileUser).insert({
      id: userId,
      firstName: 'Negar',
      lastName: 'Khosravi',
      ...overrides,
    });

  const storedRow = (id: string) =>
    testDbClient(Tables.UserProfileUser).where({ id }).first();

  beforeAll(async () => {
    // Kiritimati is UTC+14, so its calendar date runs ahead of UTC for most of
    // the day (the time zone test below relies on it).
    process.env.APP_TIME_ZONE = 'Pacific/Kiritimati';
    const nestTestSetup = await createNestApp([UserProfileModule]);
    module = nestTestSetup.module;
    app = nestTestSetup.app;
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    userProfileService = module.get(UserProfileService);
  });

  beforeEach(async () => {
    await testDbClient(Tables.UserProfileUser).del();
  });

  afterAll(async () => {
    if (originalTimeZone === undefined) {
      delete process.env.APP_TIME_ZONE;
    } else {
      process.env.APP_TIME_ZONE = originalTimeZone;
    }
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

  const updateMyProfile = async (
    input: Record<string, string>,
    token?: string,
  ) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call
      .send({ query: UPDATE_MY_PROFILE, variables: { input } })
      .expect(200);
    return response.body;
  };

  const invalidFields = (body: any) =>
    body.errors[0].extensions.originalError.fields;

  it('persists every field and returns the stored row (PROFILE-03)', async () => {
    await insertCaller();

    const body = await updateMyProfile(VALID_INPUT, tokenFor(userId));

    expect(body.errors).toBeUndefined();
    expect(body.data.updateMyProfile).toEqual({
      id: userId,
      avatarUrl: null,
      ...VALID_INPUT,
    });
    await expect(storedRow(userId)).resolves.toMatchObject({
      ...VALID_INPUT,
      birthDate: expect.any(Date),
    });
  });

  it('normalizes the phone digits and trims the text before storing', async () => {
    await insertCaller();

    const body = await updateMyProfile(
      {
        ...VALID_INPUT,
        firstName: '  Sara ',
        city: ' San Francisco  ',
        zipCode: ' 94105 ',
        phoneNumber: '5588 554-88',
      },
      tokenFor(userId),
    );

    expect(body.data.updateMyProfile).toMatchObject({
      firstName: 'Sara',
      city: 'San Francisco',
      zipCode: '94105',
      phoneNumber: '558855488',
    });
    await expect(storedRow(userId)).resolves.toMatchObject({
      firstName: 'Sara',
      city: 'San Francisco',
      zipCode: '94105',
      phoneNumber: '558855488',
    });
  });

  it('keeps the avatarUrl, which the mutation cannot edit', async () => {
    await insertCaller({ avatarUrl: 'https://example.com/negar.png' });

    const body = await updateMyProfile(VALID_INPUT, tokenFor(userId));

    expect(body.data.updateMyProfile.avatarUrl).toBe(
      'https://example.com/negar.png',
    );
  });

  it('stores null for empty optional fields, and no code with an empty phone number', async () => {
    await insertCaller({ ...OTHER_ROW, id: userId });

    const body = await updateMyProfile(
      {
        ...VALID_INPUT,
        state: '',
        city: '  ',
        birthDate: '',
        phoneCountryCode: '+49',
        phoneNumber: '',
        zipCode: '',
      },
      tokenFor(userId),
    );

    const cleared = {
      state: null,
      city: null,
      birthDate: null,
      phoneCountryCode: null,
      phoneNumber: null,
      zipCode: null,
    };
    expect(body.data.updateMyProfile).toMatchObject(cleared);
    await expect(storedRow(userId)).resolves.toMatchObject(cleared);
  });

  it.each([
    [{ firstName: '  ' }, { firstName: 'Enter your name.' }],
    [{ lastName: '' }, { lastName: 'Enter your last name.' }],
    [
      { firstName: 'a'.repeat(51) },
      { firstName: 'Must be 50 characters or fewer.' },
    ],
    [{ state: 'a'.repeat(51) }, { state: 'Must be 50 characters or fewer.' }],
    [{ city: 'a'.repeat(51) }, { city: 'Must be 50 characters or fewer.' }],
    [{ zipCode: '12' }, { zipCode: 'Enter a valid zip code.' }],
    [{ zipCode: '12345678901' }, { zipCode: 'Enter a valid zip code.' }],
    [{ phoneNumber: '123' }, { phone: 'Enter a valid phone number.' }],
    [{ phoneNumber: '1'.repeat(15) }, { phone: 'Enter a valid phone number.' }],
    [{ phoneNumber: '12ab34' }, { phone: 'Enter a valid phone number.' }],
    [{ phoneCountryCode: '+7' }, { phone: 'Enter a valid phone number.' }],
    [
      { birthDate: '1899-12-31' },
      { birthDate: 'Enter a valid date of birth.' },
    ],
    [
      { birthDate: '2024-02-30' },
      { birthDate: 'Enter a valid date of birth.' },
    ],
    [
      { birthDate: '9999-12-31' },
      { birthDate: 'Enter a valid date of birth.' },
    ],
  ])(
    'rejects %j with INVALID_INPUT %j and writes nothing (PROFILE-04)',
    async (override, expected) => {
      await insertCaller();

      const body = await updateMyProfile(
        { ...VALID_INPUT, ...override },
        tokenFor(userId),
      );

      expect(body.errors[0].extensions.originalError.reason).toBe(
        'INVALID_INPUT',
      );
      expect(invalidFields(body)).toEqual(expected);
      await expect(storedRow(userId)).resolves.toMatchObject({
        firstName: 'Negar',
        lastName: 'Khosravi',
        state: null,
        city: null,
        birthDate: null,
        phoneCountryCode: null,
        phoneNumber: null,
        zipCode: null,
      });
    },
  );

  it('reports every invalid field at once', async () => {
    await insertCaller();

    const body = await updateMyProfile(
      {
        ...VALID_INPUT,
        firstName: '',
        zipCode: '1',
        phoneNumber: '12',
        birthDate: '1800-01-01',
      },
      tokenFor(userId),
    );

    expect(invalidFields(body)).toEqual({
      firstName: 'Enter your name.',
      zipCode: 'Enter a valid zip code.',
      phone: 'Enter a valid phone number.',
      birthDate: 'Enter a valid date of birth.',
    });
  });

  describe('"today" in the app time zone', () => {
    // 2031-03-15 23:00 UTC is already 2031-03-16 in Kiritimati (UTC+14) and
    // still 2031-03-15 in Los Angeles (UTC-7).
    const NOW = new Date('2031-03-15T23:00:00.000Z');

    afterEach(() => {
      configService.set('app', { timeZone: 'Pacific/Kiritimati' });
    });

    it('accepts the current date in the app time zone', async () => {
      await insertCaller();
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Kiritimati',
      }).format(NOW);

      const saved = await userProfileService.updateMyProfile(
        userId,
        { ...VALID_INPUT, birthDate: today },
        NOW,
      );

      expect(today).toBe('2031-03-16');
      expect(saved.birthDate).toBe('2031-03-16');
    });

    it('accepts the date of a zone ahead of UTC', async () => {
      await insertCaller();

      const saved = await userProfileService.updateMyProfile(
        userId,
        { ...VALID_INPUT, birthDate: '2031-03-16' },
        NOW,
      );

      expect(saved.birthDate).toBe('2031-03-16');
    });

    it('rejects the day after the zone date', async () => {
      await insertCaller();

      await expect(
        userProfileService.updateMyProfile(
          userId,
          { ...VALID_INPUT, birthDate: '2031-03-17' },
          NOW,
        ),
      ).rejects.toMatchObject({
        reason: 'INVALID_INPUT',
        fields: { birthDate: 'Enter a valid date of birth.' },
      });
    });

    it('rejects the UTC-ahead date in a zone behind UTC', async () => {
      await insertCaller();
      configService.set('app', { timeZone: 'America/Los_Angeles' });

      await expect(
        userProfileService.updateMyProfile(
          userId,
          { ...VALID_INPUT, birthDate: '2031-03-16' },
          NOW,
        ),
      ).rejects.toMatchObject({ reason: 'INVALID_INPUT' });
      await expect(
        userProfileService.updateMyProfile(
          userId,
          { ...VALID_INPUT, birthDate: '2031-03-15' },
          NOW,
        ),
      ).resolves.toMatchObject({ birthDate: '2031-03-15' });
    });
  });

  it('returns identical profiles when the same input is saved twice', async () => {
    await insertCaller();

    const first = await updateMyProfile(VALID_INPUT, tokenFor(userId));
    const second = await updateMyProfile(VALID_INPUT, tokenFor(userId));

    expect(first.errors).toBeUndefined();
    expect(second.data.updateMyProfile).toEqual(first.data.updateMyProfile);
  });

  it('changes only the caller row (PROFILE-06)', async () => {
    await insertCaller();
    await testDbClient(Tables.UserProfileUser).insert(OTHER_ROW);

    await updateMyProfile(VALID_INPUT, tokenFor(userId));

    await expect(storedRow(otherUserId)).resolves.toMatchObject({
      ...OTHER_ROW,
      birthDate: expect.any(Date),
    });
  });

  it('responds UNAUTHENTICATED without a token and writes nothing', async () => {
    await insertCaller();

    const body = await updateMyProfile(VALID_INPUT);

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.data).toBeNull();
    await expect(storedRow(userId)).resolves.toMatchObject({
      firstName: 'Negar',
      city: null,
    });
  });

  it('responds UNAUTHENTICATED with an invalid token', async () => {
    await insertCaller();

    const body = await updateMyProfile(VALID_INPUT, 'not-a-token');

    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('fails with reason PROFILE_NOT_FOUND when the caller has no row, and creates none', async () => {
    const body = await updateMyProfile(VALID_INPUT, tokenFor(userId));

    expect(body.errors[0].extensions.originalError.reason).toBe(
      'PROFILE_NOT_FOUND',
    );
    await expect(storedRow(userId)).resolves.toBeUndefined();
  });
});
