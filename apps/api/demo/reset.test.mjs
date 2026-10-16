import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fixture } from './fixture.mjs';
import { seed, ids } from './seed.mjs';
import { reset } from './reset.mjs';
let db;
before(async () => { db = await fixture(); });
after(async () => { await db?.close(); });
beforeEach(async () => {
  await db.client.query('TRUNCATE "IdentityUser" CASCADE');
  await seed(db.env);
  await db.client.query(`INSERT INTO "IdentityUser" (id,email,"passwordHash") VALUES ('d4000000-0000-4000-8000-000000000001','visitor@demo.invalid','unusable')`);
});
const users = async () => (await db.client.query('SELECT email FROM "IdentityUser"')).rows;
test('missing demo flag refuses before deletion', async () => {
  await assert.rejects(reset({ ...db.env, DEMO_MODE: undefined }), /explicitly enabled/);
  assert.deepEqual(await users(), [{ email: 'visitor@demo.invalid' }]);
});
test('missing or mismatched confirmation refuses before deletion', async () => {
  for (const confirmation of [undefined, `${db.name}_wrong`]) {
    await assert.rejects(reset({ ...db.env, DEMO_DATABASE_NAME: confirmation }), /confirmation/);
    assert.deepEqual(await users(), [{ email: 'visitor@demo.invalid' }]);
  }
});
test('test and non-demo targets are refused by CLI without exposing URL', () => {
  for (const name of ['seat-sure-test', 'seat-sure', 'seat-demo-production', 'postgres']) {
    const result = spawnSync(process.execPath, ['apps/api/demo/reset.mjs'], { env: { ...process.env, ...db.env, DEMO_DATABASE_NAME: name, DATABASE_URL: `postgresql://sensitive:private@invalid/${name}` }, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /Demo operation failed/); assert.doesNotMatch(result.stderr, /sensitive|private/);
  }
});
test('prohibited and unconfirmed names are refused by the guard before any connection', async () => {
  for (const name of ['seat-demo-test', 'demo-prod', 'seat-demo-production']) {
    await assert.rejects(
      reset({ ...db.env, DEMO_DATABASE_NAME: name, DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:5432/${name}` }),
      /dedicated demo database confirmation/,
    );
  }
});
test('successful reset clears visitor state and restores catalog inventory', async () => {
  await db.client.query('UPDATE "CatalogTicketType" SET "seatsAvailable"=0');
  const visitor = 'd4000000-0000-4000-8000-000000000001';
  const order = 'd4000000-0000-4000-8000-000000000002';
  const item = 'd4000000-0000-4000-8000-000000000003';
  await db.client.query(`INSERT INTO "TicketingOrder" (id,"userId","eventId","eventName","eventStartAt","eventCoverImage","eventVenue","eventCity","eventCountry","ticketTypeId","ticketTypeName",currency,status,"subtotalCents","serviceFeeCents","taxCents","totalCents","expiresAt") VALUES ($1,$2,$3,'Night Signals',now(),'/demo/night-signals.svg','Signal Hall','Sao Paulo','Brazil',$4,'Floor','USD','paid',4500,300,0,4800,now())`, [order,visitor,ids.event,ids.ticket]);
  await db.client.query(`INSERT INTO "TicketingOrderItem" (id,"orderId","seatId","seatRow","seatNumber","unitPriceCents","serviceFeeCents","taxCents") VALUES ($1,$2,'d3000000-0000-4000-8000-000000000100','A','01',4500,300,0)`, [item,order]);
  await db.client.query(`INSERT INTO "TicketingTicket" (id,"eventId","userId",code,status,"orderItemId") VALUES ('d4000000-0000-4000-8000-000000000004',$1,$2,'demo-ticket','issued',$3)`,[ids.event,visitor,item]);
  await db.client.query(`INSERT INTO "BillingPaymentCard" (id,"userId",provider,"providerToken",fingerprint,brand,last4,"expMonth","expYear",holder,"isDefault") VALUES ('d4000000-0000-4000-8000-000000000005',$1,'simulator','fixture-token',repeat('a',64),'visa','4242',12,2099,'Demo Visitor',true)`,[visitor]);
  assert.equal((await db.client.query('SELECT count(*)::int n FROM "TicketingTicket"')).rows[0].n, 1);
  assert.equal((await db.client.query('SELECT count(*)::int n FROM "BillingPaymentCard"')).rows[0].n, 1);

  await reset(db.env);
  assert.deepEqual(await users(), []);
  assert.equal((await db.client.query('SELECT "seatsAvailable" FROM "CatalogTicketType"')).rows[0].seatsAvailable, 24);
  const tables = await db.client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ~ '^(Identity|UserProfile|Billing|Ticketing|Notifications)'`);
  for (const { tablename } of tables.rows) assert.equal((await db.client.query(`SELECT count(*)::int n FROM "${tablename}"`)).rows[0].n, 0, tablename);
});
test('reset refreshes stale sample dates into future', async () => {
  await db.client.query(`UPDATE "CatalogEvent" SET date='2020-01-01',"startAt"='2020-01-01',"endsAt"='2020-01-02',"doorsOpen"='2019-12-31'`);
  await reset(db.env);
  const row = (await db.client.query('SELECT date,"startAt","endsAt","doorsOpen" FROM "CatalogEvent"')).rows[0];
  assert.ok(row.date > new Date()); assert.equal(+row.date, +row.startAt); assert.ok(row.endsAt > row.startAt); assert.ok(row.doorsOpen < row.startAt);
});
test('seed failure rolls back all reset deletions and dates', async () => {
  const prior = (await db.client.query('SELECT id,"startAt" FROM "CatalogEvent"')).rows;
  await db.client.query(`CREATE FUNCTION reject_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER reject_reset BEFORE INSERT ON "CatalogEvent" FOR EACH ROW EXECUTE FUNCTION reject_reset()`);
  try {
    await assert.rejects(reset(db.env));
    assert.deepEqual(await users(), [{ email: 'visitor@demo.invalid' }]);
    assert.deepEqual((await db.client.query('SELECT id,"startAt" FROM "CatalogEvent"')).rows, prior);
  } finally { await db.client.query('DROP TRIGGER reject_reset ON "CatalogEvent"; DROP FUNCTION reject_reset()'); }
});
