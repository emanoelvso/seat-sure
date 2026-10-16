import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { start, command } from './start.mjs';
import { migrate } from './migrate.mjs';
import { fixture } from './fixture.mjs';
const env = { DEMO_MODE: 'true', DEMO_DATABASE_NAME: 'seat_demo_sequence', DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1/seat_demo_sequence' };
async function sequence(failAt) {
  const dir = await mkdtemp(join(tmpdir(), 'seat-start-')); const file = join(dir,'sequence');
  let index = 0;
  try {
    const run = async (script) => { index++; await command(['--input-type=module', '-e', `import {appendFileSync} from 'node:fs';appendFileSync(${JSON.stringify(file)},${JSON.stringify(script+'\n')});process.exit(${index === failAt ? 7 : 0})`], process.env); };
    let code = 0;
    try { await start(env, run); } catch (error) { code = error.exitCode; }
    return { code, lines: (await readFile(file,'utf8')).trim().split('\n') };
  } finally { await rm(dir,{ recursive:true,force:true }); }
}
test('migration, seed and traffic run in order', async () => {
  assert.deepEqual(await sequence(), { code:0, lines:['demo/migrate.mjs','demo/seed.mjs','dist/main.js'] });
});
test('migration failure stops seed and server with original nonzero status', async () => {
  assert.deepEqual(await sequence(1), { code:7, lines:['demo/migrate.mjs'] });
});
test('seed failure stops server with original nonzero status', async () => {
  assert.deepEqual(await sequence(2), { code:7, lines:['demo/migrate.mjs','demo/seed.mjs'] });
});
test('unconfirmed startup exits nonzero before touching database or traffic', () => {
  const result = spawnSync(process.execPath,['apps/api/demo/start.mjs'], {env:{...process.env,...env, DEMO_DATABASE_NAME:'wrong'},encoding:'utf8'});
  assert.equal(result.status,1); assert.match(result.stderr,/Demo operation failed/);
});
test('compiled migrations initialize all six contexts on an empty real database and repeat safely', async () => {
  const db = await fixture();
  try {
    await db.client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await migrate(db.env);
    const rows = (await db.client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%_migrations' ORDER BY tablename`)).rows;
    assert.deepEqual(rows.map(r=>r.tablename), ['billing_migrations','catalog_migrations','identity_migrations','notifications_migrations','ticketing_migrations','user_profile_migrations']);
    const counts = async () => Promise.all(rows.map(async ({tablename}) => (await db.client.query(`SELECT count(*)::int n FROM "${tablename}"`)).rows[0].n));
    const first = await counts(); assert.ok(first.every(n=>n>0)); await migrate(db.env); assert.deepEqual(await counts(),first);
    const { seed, ids } = await import('./seed.mjs'); await seed(db.env);
    assert.equal((await db.client.query('SELECT count(*)::int n FROM "CatalogSeat" WHERE "seatMapId"=$1',[ids.map])).rows[0].n,24);
  } finally { await db.close(); }
});
