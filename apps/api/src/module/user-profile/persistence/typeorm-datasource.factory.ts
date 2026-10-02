import { ConfigService } from '@sharedModules/config/service/config.service';
import { join } from 'path';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';

export const dataSourceOptionsFactory = (
  configService: ConfigService,
): PostgresDataSourceOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: 5432,
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  synchronize: false,
  logging: false,
  migrationsRun: false,
  migrationsTableName: 'user_profile_migrations',
  entities: [join(__dirname, 'entity', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migration', '*-migration.{ts,js}')],
});
