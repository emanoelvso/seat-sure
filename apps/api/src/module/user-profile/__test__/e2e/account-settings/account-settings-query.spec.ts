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

const QUERY = `query { mySettings { eventReminders exclusiveOffers ticketAvailability emailNotifications pushNotifications language } }`;
const DEFAULTS = {
  eventReminders: false,
  exclusiveOffers: true,
  ticketAvailability: false,
  emailNotifications: true,
  pushNotifications: false,
  language: 'en',
};

describe('mySettings (SET-03,04,13)', () => {
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
  const query = async (authorization?: string) => {
    const call = request(app.getHttpServer()).post('/graphql');
    if (authorization) call.set('Authorization', `Bearer ${authorization}`);
    return (await call.send({ query: QUERY }).expect(200)).body;
  };
  it('returns exactly the six defaults', async () => {
    const body = await query(token());
    expect(body.errors).toBeUndefined();
    expect(body.data.mySettings).toEqual(DEFAULTS);
  });
  it('returns persisted values owned by each caller', async () => {
    expect((await query(token())).data.mySettings).toEqual(DEFAULTS);
    expect((await query(token(otherId))).data.mySettings).toEqual({
      ...DEFAULTS,
      language: 'pt-BR',
      pushNotifications: true,
    });
  });
  it.each(['absent', 'invalid', 'expired'])(
    'rejects %s authentication',
    async (kind) => {
      const value =
        kind === 'absent'
          ? undefined
          : kind === 'invalid'
            ? 'bad-token'
            : token(id, 1);
      const body = await query(value);
      expect(body.data).toBeNull();
      expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    },
  );
  it('reports a missing profile instead of foreign settings', async () => {
    const body = await query(token(randomUUID()));
    expect(body.data).toBeNull();
    expect(body.errors[0].extensions.originalError.reason).toBe(
      'PROFILE_NOT_FOUND',
    );
  });
  it('propagates storage failures instead of supplying defaults', async () => {
    const spy = jest
      .spyOn(module.get(UserProfileUserRepository), 'findOneById')
      .mockRejectedValueOnce(new Error('Storage unavailable'));
    const body = await query(token());
    expect(body.data).toBeNull();
    expect(body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
    spy.mockRestore();
  });
});
