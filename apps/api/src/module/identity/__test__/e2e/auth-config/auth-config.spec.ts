import os from 'os';
import { Module } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigException } from '@sharedModules/config/exception/config.exception';
import { createNestApp } from '@testInfra/test-e2e.setup';

// A trivial Query root is required by Nest's code-first GraphQL schema
// builder; this test boots only ConfigModule, no domain module provides one.
@Resolver()
class ConfigProbeResolver {
  @Query(() => Boolean)
  configProbeHealthCheck(): boolean {
    return true;
  }
}

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [ConfigProbeResolver],
})
class ConfigProbeModule {}

describe('Auth configuration (e2e)', () => {
  const originalEnv = {
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_CODE_SENDER: process.env.AUTH_CODE_SENDER,
  };

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv.JWT_SECRET;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.AUTH_CODE_SENDER = originalEnv.AUTH_CODE_SENDER;
  });

  // GraphqlModule writes autoSchemaFile to `schema.gql` under process.cwd()
  // whenever `env` isn't 'test'. Booting with NODE_ENV=development here would
  // overwrite the real, committed schema.gql, so the successful boot runs
  // from a throwaway cwd.
  const boot = async () => {
    const cwd = process.cwd();
    process.chdir(os.tmpdir());
    try {
      const { app } = await createNestApp([ConfigProbeModule]);
      await app.close();
    } finally {
      process.chdir(cwd);
    }
  };

  it('rejects with ConfigException when JWT_SECRET is unset (AUTH-51)', async () => {
    delete process.env.JWT_SECRET;

    await expect(boot()).rejects.toThrow(ConfigException);
  });

  it('rejects with ConfigException when JWT_SECRET has 31 chars', async () => {
    process.env.JWT_SECRET = 'a'.repeat(31);

    await expect(boot()).rejects.toThrow(ConfigException);
  });

  it('boots when JWT_SECRET has 32 chars', async () => {
    process.env.JWT_SECRET = 'a'.repeat(32);

    await expect(boot()).resolves.toBeUndefined();
  });

  it('rejects with ConfigException when NODE_ENV is production and AUTH_CODE_SENDER is log (AUTH-53)', async () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.NODE_ENV = 'production';
    process.env.AUTH_CODE_SENDER = 'log';

    await expect(boot()).rejects.toThrow(ConfigException);
  });

  it('boots when NODE_ENV is development and AUTH_CODE_SENDER is log', async () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.NODE_ENV = 'development';
    process.env.AUTH_CODE_SENDER = 'log';

    await expect(boot()).resolves.toBeUndefined();
  });
});
