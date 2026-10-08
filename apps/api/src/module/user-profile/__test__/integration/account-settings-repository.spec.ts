import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
import { UserProfilePersistenceModule } from '@userProfileModule/persistence/user-profile-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const DEFAULTS = {
  eventReminders: false,
  exclusiveOffers: true,
  ticketAvailability: false,
  emailNotifications: true,
  pushNotifications: false,
  language: 'en',
};

describe('Account settings repository (SET-03,04,08,15,16)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let repository: UserProfileUserRepository;
  const userId = randomUUID();
  const otherId = randomUUID();
  const stored = (id = userId) =>
    testDbClient(Tables.UserProfileUser).where({ id }).first();

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [UserProfilePersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('user-profile'));
    repository = module.get(UserProfileUserRepository);
  });
  beforeEach(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await repository.create({
      id: userId,
      firstName: 'Ana',
      lastName: 'Silva',
    });
    await repository.create({
      id: otherId,
      firstName: 'Other',
      lastName: 'User',
    });
  });
  afterAll(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('persists the six specified defaults on a newly created profile', async () => {
    expect(await stored()).toMatchObject(DEFAULTS);
    expect(await repository.findOneById(userId)).toMatchObject(DEFAULTS);
  });

  it.each([
    { eventReminders: true },
    { exclusiveOffers: false },
    { ticketAvailability: true },
    { emailNotifications: false },
    { pushNotifications: true },
    { language: 'pt-BR' as const },
  ])('patches %j and preserves peers and the other account', async (patch) => {
    expect(await repository.updateSettings(userId, patch)).toBe(true);
    expect(await stored()).toMatchObject({
      ...DEFAULTS,
      ...patch,
      firstName: 'Ana',
      lastName: 'Silva',
    });
    expect(await repository.findOneById(userId)).toMatchObject({
      ...DEFAULTS,
      ...patch,
    });
    expect(await stored(otherId)).toMatchObject(DEFAULTS);
  });

  it('retains the requested value when retried without adding rows', async () => {
    await repository.updateSettings(userId, { eventReminders: true });
    await repository.updateSettings(userId, { eventReminders: true });
    expect(await stored()).toMatchObject({ ...DEFAULTS, eventReminders: true });
    expect(
      await testDbClient(Tables.UserProfileUser).where({ id: userId }),
    ).toHaveLength(1);
  });

  it('preserves independently committed concurrent changes', async () => {
    await Promise.all([
      repository.updateSettings(userId, { eventReminders: true }),
      repository.updateSettings(userId, { language: 'pt-BR' }),
      repository.updateSettings(userId, { exclusiveOffers: false }),
    ]);
    expect(await stored()).toMatchObject({
      ...DEFAULTS,
      eventReminders: true,
      language: 'pt-BR',
      exclusiveOffers: false,
    });
  });

  it('reports a missing profile without modifying another account', async () => {
    expect(
      await repository.updateSettings(randomUUID(), {
        pushNotifications: true,
      }),
    ).toBe(false);
    expect(await stored()).toMatchObject(DEFAULTS);
    expect(await stored(otherId)).toMatchObject(DEFAULTS);
  });
});
