import { ConfigService } from '@sharedModules/config/service/config.service';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';

// Parse connection URLs ourselves so query parameters cannot override verified TLS.
export const connectionOptions = (
  config: ConfigService,
): PostgresDataSourceOptions => {
  const database = config.get('database');
  const url = database.url ? new URL(database.url) : undefined;
  const mode = url?.searchParams.get('sslmode');
  const ssl = database.ssl || (!!mode && mode !== 'disable');
  return {
    type: 'postgres',
    host: url ? url.hostname : database.host,
    port: url ? Number(url.port || 5432) : database.port,
    username: url ? decodeURIComponent(url.username) : database.username,
    password: url ? decodeURIComponent(url.password) : database.password,
    database: url
      ? decodeURIComponent(url.pathname.slice(1))
      : database.database,
    ssl: ssl ? { rejectUnauthorized: true } : false,
  };
};
