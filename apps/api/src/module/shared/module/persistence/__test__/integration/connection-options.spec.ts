import { dataSourceOptionsFactory as catalog } from '@catalogModule/persistence/typeorm-datasource.factory';
import { dataSourceOptionsFactory as ticketing } from '@ticketingModule/persistence/typeorm-datasource.factory';
import { dataSourceOptionsFactory as identity } from '@identityModule/persistence/typeorm-datasource.factory';
import { dataSourceOptionsFactory as profile } from '@userProfileModule/persistence/typeorm-datasource.factory';
import { dataSourceOptionsFactory as billing } from '@billingModule/persistence/typeorm-datasource.factory';
import { dataSourceOptionsFactory as notifications } from '@notificationsModule/persistence/typeorm-datasource.factory';
import { databaseSchema } from '@sharedModules/config/util/config.schema';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { connectionOptions } from '@sharedModules/persistence/typeorm/connection-options.util';
import { DataSource } from 'typeorm';

const config = (database: Record<string, unknown>) =>
  new ConfigService({ database } as any);
const discrete = {
  host: 'discrete.invalid',
  port: 5544,
  username: 'discrete',
  password: 'fixture',
  database: 'discrete',
};

describe('Hosted PostgreSQL options (REL-29)', () => {
  it.each([
    ['catalog', catalog, 'catalog_migrations'],
    ['ticketing', ticketing, 'ticketing_migrations'],
    ['identity', identity, 'identity_migrations'],
    ['user-profile', profile, 'user_profile_migrations'],
    ['billing', billing, 'billing_migrations'],
    ['notifications', notifications, 'notifications_migrations'],
  ] as const)(
    'honors URL and verified TLS in %s without changing its migration/entity paths',
    (name, factory, table) => {
      const options = factory(
        config({
          ...discrete,
          url: 'postgresql://hosted:p%40ss@hosted.invalid:6543/demo?sslmode=require',
        }),
      );
      expect(options).toMatchObject({
        type: 'postgres',
        host: 'hosted.invalid',
        port: 6543,
        username: 'hosted',
        password: 'p@ss',
        database: 'demo',
        ssl: { rejectUnauthorized: true },
        migrationsTableName: table,
        synchronize: false,
        migrationsRun: false,
        logging: false,
      });
      expect(options.entities).toEqual([
        expect.stringContaining(`/module/${name}/persistence/entity/`),
      ]);
      expect(options.migrations).toEqual([
        expect.stringContaining(`/module/${name}/persistence/migration/`),
      ]);
    },
  );

  it.each(['not a URL', 'postgres://u:p@host/demo?sslmode=no-verify'])(
    'rejects invalid or unverified connection input %#',
    (url) => {
      const result = databaseSchema.safeParse({ url });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).not.toContain(url);
    },
  );

  it('uses discrete nondefault port without a URL', () => {
    expect(connectionOptions(config(discrete))).toMatchObject({
      ...discrete,
      type: 'postgres',
      ssl: false,
    });
  });

  it.each(['verify-ca', 'verify-full'])(
    'verifies certificates for URL sslmode=%s',
    (mode) => {
      expect(
        connectionOptions(
          config({ url: `postgres://u:p@host/demo?sslmode=${mode}` }),
        ).ssl,
      ).toEqual({ rejectUnauthorized: true });
    },
  );

  it('honors explicit TLS even if the URL requests disable', () => {
    expect(
      connectionOptions(
        config({ url: 'postgres://u:p@host/demo?sslmode=disable', ssl: true }),
      ).ssl,
    ).toEqual({ rejectUnauthorized: true });
  });

  it('connects to the disposable PostgreSQL using the shared URL options', async () => {
    const datasource = new DataSource(
      connectionOptions(config({ url: process.env.DATABASE_URL })),
    );
    try {
      await datasource.initialize();
      expect(await datasource.query('SELECT 1 AS healthy')).toEqual([
        { healthy: 1 },
      ]);
    } finally {
      if (datasource.isInitialized) await datasource.destroy();
    }
  });
});
