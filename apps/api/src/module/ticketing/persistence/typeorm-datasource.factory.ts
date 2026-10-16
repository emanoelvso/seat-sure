import { connectionOptions } from '@sharedModules/persistence/typeorm/connection-options.util';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { join } from 'path';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';

export const dataSourceOptionsFactory = (
  configService: ConfigService,
): PostgresDataSourceOptions => ({
  ...connectionOptions(configService),
  synchronize: false,
  logging: false,
  migrationsRun: false,
  migrationsTableName: 'ticketing_migrations',
  entities: [join(__dirname, 'entity', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migration', '*-migration.{ts,js}')],
});
