import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
import { UserProfilePersistenceModule } from '@userProfileModule/persistence/user-profile-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

const FULL_PROFILE = {
  firstName: 'Sara',
  lastName: 'Ahmadi',
  state: 'California',
  city: 'San Francisco',
  birthDate: '1995-08-17',
  phoneCountryCode: '+49',
  phoneNumber: '558855488',
  zipCode: '94105',
};

const EMPTY_OPTIONALS = {
  state: null,
  city: null,
  birthDate: null,
  phoneCountryCode: null,
  phoneNumber: null,
  zipCode: null,
};

describe('UserProfileUserRepository (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let repository: UserProfileUserRepository;

  const insertUser = async (id = randomUUID()) => {
    await repository.create({ id, firstName: 'Negar', lastName: 'Khosravi' });
    return id;
  };

  const stored = (id: string) =>
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
  });

  afterAll(async () => {
    await testDbClient(Tables.UserProfileUser).del();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('creates a profile with every optional column null', async () => {
    const id = await insertUser();

    const row = await stored(id);

    expect(row).toMatchObject({
      firstName: 'Negar',
      lastName: 'Khosravi',
      avatarUrl: null,
      ...EMPTY_OPTIONALS,
    });
  });

  it('writes every editable column and reports the row as updated', async () => {
    const id = await insertUser();

    const updated = await repository.updateProfile(id, FULL_PROFILE);

    expect(updated).toBe(true);
    await expect(repository.findOneById(id)).resolves.toMatchObject(
      FULL_PROFILE,
    );
    await expect(stored(id)).resolves.toMatchObject({
      ...FULL_PROFILE,
      birthDate: expect.any(Date),
    });
  });

  it('reads birthDate back as the YYYY-MM-DD string it was written as', async () => {
    const id = await insertUser();

    await repository.updateProfile(id, {
      ...FULL_PROFILE,
      birthDate: '1900-01-01',
    });

    const profile = await repository.findOneById(id);
    expect(profile?.birthDate).toBe('1900-01-01');
    expect(typeof profile?.birthDate).toBe('string');
  });

  it('clears every optional column when null is written', async () => {
    const id = await insertUser();
    await repository.updateProfile(id, FULL_PROFILE);

    const updated = await repository.updateProfile(id, {
      firstName: 'Sara',
      lastName: 'Ahmadi',
      ...EMPTY_OPTIONALS,
    });

    expect(updated).toBe(true);
    await expect(stored(id)).resolves.toMatchObject({
      firstName: 'Sara',
      lastName: 'Ahmadi',
      ...EMPTY_OPTIONALS,
    });
  });

  it('keeps the avatarUrl, which is not editable here', async () => {
    const id = await insertUser();
    await testDbClient(Tables.UserProfileUser)
      .where({ id })
      .update({ avatarUrl: 'https://example.com/a.png' });

    await repository.updateProfile(id, FULL_PROFILE);

    await expect(stored(id)).resolves.toMatchObject({
      avatarUrl: 'https://example.com/a.png',
    });
  });

  it('returns false and writes nothing for an unknown id', async () => {
    const otherId = await insertUser();

    const updated = await repository.updateProfile(randomUUID(), FULL_PROFILE);

    expect(updated).toBe(false);
    await expect(stored(otherId)).resolves.toMatchObject({
      firstName: 'Negar',
      ...EMPTY_OPTIONALS,
    });
  });

  it('changes only the row with the given id', async () => {
    const id = await insertUser();
    const otherId = await insertUser();

    await repository.updateProfile(id, FULL_PROFILE);

    await expect(stored(otherId)).resolves.toMatchObject({
      firstName: 'Negar',
      lastName: 'Khosravi',
      ...EMPTY_OPTIONALS,
    });
  });

  it('refreshes updatedAt', async () => {
    const id = await insertUser();
    const before = (await stored(id)).updatedAt as Date;
    await new Promise((resolve) => setTimeout(resolve, 20));

    await repository.updateProfile(id, FULL_PROFILE);

    const after = (await stored(id)).updatedAt as Date;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});
