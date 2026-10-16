import pg from 'pg';
import { execFileSync } from 'node:child_process';

// Disposable local fixtures only. Never read application environment files.
export async function fixture() {
  const name = `seat_sure_demo_fixture_${process.pid}`;
  const admin = new pg.Client({ host: '127.0.0.1', user: 'postgres', password: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  const client = new pg.Client({ host: '127.0.0.1', user: 'postgres', password: 'postgres', database: name });
  await client.connect();
  const schema = execFileSync('docker', ['exec', 'seat-sure-db', 'pg_dump', '-U', 'postgres', '-d', 'seat-sure-test', '--schema-only', '--no-owner', '--no-privileges'], { encoding: 'utf8' }).replace(/^\\.*$/gm, '');
  await client.query(schema);
  await client.query('SET search_path TO public');
  const env = { DEMO_MODE: 'true', DEMO_DATABASE_NAME: name, DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${name}` };
  return { client, env, name, async close() { await client.end(); await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); } };
}
