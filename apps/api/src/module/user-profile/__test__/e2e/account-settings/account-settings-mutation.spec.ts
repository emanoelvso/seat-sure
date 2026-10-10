import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { UserProfileModule } from '@userProfileModule/user-profile.module';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
import request from 'supertest';
import { DataSource } from 'typeorm';

const QUERY = `mutation UpdateMySettings($input: UpdateMySettingsInput!) { updateMySettings(input: $input) { eventReminders exclusiveOffers ticketAvailability emailNotifications pushNotifications language } }`;
const DEFAULTS = {
  eventReminders: false,
  exclusiveOffers: true,
  ticketAvailability: false,
  emailNotifications: true,
  pushNotifications: false,
  language: 'en',
};

describe('updateMySettings (SET-07,08,13,14,15,16)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let jwt: JwtService;
  const id = randomUUID();
  const otherId = randomUUID();
  beforeAll(async () => {
    ({ app, module } = await createNestApp([UserProfileModule]));
    jwt = module.get(JwtService);
  });
  beforeEach(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient(Tables.UserProfileUser).insert([
      { id, firstName: 'Ana', lastName: 'Silva' },
      {
        id: otherId,
        firstName: 'Other',
        lastName: 'User',
        language: 'pt-BR',
        pushNotifications: true,
      },
    ]);
  });
  afterAll(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    const ds = module.get<DataSource>(getDataSourceToken('user-profile'));
    if (ds.isInitialized) await ds.destroy();
    await app.getHttpServer().close();
  });
  const token = (sub = id, exp = Math.floor(Date.now() / 1000) + 900) =>
    jwt.sign({ sub, sid: randomUUID(), exp });
  const mutate = async (input: unknown, authorization?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (authorization) call.set('Authorization', `Bearer ${authorization}`);
    return (await call.send({ query: QUERY, variables: { input } })).body;
  };
  const stored = (userId = id) =>
    testDbClient(Tables.UserProfileUser).where({ id: userId }).first();
  it.each([
    { eventReminders: true },
    { exclusiveOffers: false },
    { ticketAvailability: true },
    { emailNotifications: false },
    { pushNotifications: true },
    { language: 'pt-BR' },
    { language: 'en' },
  ])('saves exactly one preference %j and returns all six', async (patch) => {
    const body = await mutate(patch, token());
    expect(body.errors).toBeUndefined();
    expect(body.data.updateMySettings).toEqual({ ...DEFAULTS, ...patch });
    expect(await stored()).toMatchObject({ ...DEFAULTS, ...patch });
    expect(await stored(otherId)).toMatchObject({
      ...DEFAULTS,
      language: 'pt-BR',
      pushNotifications: true,
    });
  });
  it.each([
    {},
    { eventReminders: null },
    { language: null },
    { language: 'xx' },
    { eventReminders: true, pushNotifications: true },
    { language: '' },
    { eventReminders: 'true' },
    { eventReminders: 1 },
    { userId: 'other', eventReminders: true },
    { unknownSetting: true },
  ])('rejects invalid input %j without writes', async (input) => {
    const body = await mutate(input, token());
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.data?.updateMySettings).toBeUndefined();
    expect(await stored()).toMatchObject(DEFAULTS);
  });
  it.each(['absent', 'invalid', 'expired'])(
    'rejects %s authentication without writes',
    async (kind) => {
      const authorization =
        kind === 'absent'
          ? undefined
          : kind === 'invalid'
            ? 'bad-token'
            : token(id, 1);
      const body = await mutate({ eventReminders: true }, authorization);
      expect(body.data).toBeNull();
      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(await stored()).toMatchObject(DEFAULTS);
    },
  );
  it('reports missing profile without touching another user', async () => {
    const body = await mutate({ language: 'pt-BR' }, token(randomUUID()));
    expect(body.data).toBeNull();
    expect(body.errors[0].extensions.originalError.reason).toBe(
      'PROFILE_NOT_FOUND',
    );
    expect(await stored()).toMatchObject(DEFAULTS);
  });
  it('retains requested values on retry', async () => {
    await mutate({ eventReminders: true }, token());
    expect(
      (await mutate({ eventReminders: true }, token())).data.updateMySettings,
    ).toEqual({ ...DEFAULTS, eventReminders: true });
    expect(
      await testDbClient(Tables.UserProfileUser).where({ id }),
    ).toHaveLength(1);
  });
  it('retains both independent concurrent changes', async () => {
    await Promise.all([
      mutate({ eventReminders: true }, token()),
      mutate({ language: 'pt-BR' }, token()),
    ]);
    expect(await stored()).toMatchObject({
      ...DEFAULTS,
      eventReminders: true,
      language: 'pt-BR',
    });
  });
  it('reports write failure without a success response or changed settings', async () => {
    const spy = jest
      .spyOn(module.get(UserProfileUserRepository), 'updateSettings')
      .mockRejectedValueOnce(new Error('Write unavailable'));
    const body = await mutate({ eventReminders: true }, token());
    expect(body.data).toBeNull();
    expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
    expect(await stored()).toMatchObject(DEFAULTS);
    spy.mockRestore();
  });
});
