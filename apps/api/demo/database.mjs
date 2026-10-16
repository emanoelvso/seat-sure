import pg from 'pg';
import { pathToFileURL } from 'node:url';

export function demoOptions(env) {
  if (env.DEMO_MODE !== 'true') throw new Error('Demo mode must be explicitly enabled.');
  const url = new URL(env.DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/(?:^|[-_])demo(?:[-_]|$)/i.test(database) || /(?:^|[-_])(test|prod|production)(?:[-_]|$)/i.test(database) || database !== env.DEMO_DATABASE_NAME) {
    throw new Error('An exact dedicated demo database confirmation is required.');
  }
  const sslmode = url.searchParams.get('sslmode');
  const ssl = env.DATABASE_SSL === 'true' || (!!sslmode && sslmode !== 'disable');
  return { host: url.hostname, port: Number(url.port || 5432), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database, ssl: ssl ? { rejectUnauthorized: true } : false };
}
export async function transaction(env, work) {
  const client = new pg.Client(demoOptions(env));
  await client.connect();
  try { await client.query('BEGIN'); await work(client); await client.query('COMMIT'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
export function runCli(meta, work) {
  if (process.argv[1] && meta === pathToFileURL(process.argv[1]).href) {
    work().catch(() => { console.error('Demo operation failed. Check mode, target confirmation and database availability.'); process.exitCode = 1; });
  }
}
