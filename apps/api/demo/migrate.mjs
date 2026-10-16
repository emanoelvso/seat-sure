import { createRequire } from 'node:module';
import { DataSource } from 'typeorm';
import { demoOptions, runCli } from './database.mjs';
const require = createRequire(import.meta.url);
const contexts = ['catalog', 'ticketing', 'user-profile', 'identity', 'billing', 'notifications'];

// Uses compiled factories and migrations; no tsx, CLI dev dependency or .env file.
export async function migrate(env = process.env) {
  const options = demoOptions(env);
  const database = { url: env.DATABASE_URL, ssl: options.ssl !== false };
  for (const context of contexts) {
    const { dataSourceOptionsFactory } = require(`../dist/module/${context}/persistence/typeorm-datasource.factory.js`);
    const datasource = new DataSource(dataSourceOptionsFactory({ get: () => database }));
    try { await datasource.initialize(); await datasource.runMigrations(); }
    finally { if (datasource.isInitialized) await datasource.destroy(); }
  }
}
runCli(import.meta.url, () => migrate());
