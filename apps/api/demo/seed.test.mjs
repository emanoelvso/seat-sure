import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { seed, ids } from './seed.mjs';
let db;
before(async () => { db = await fixture(); });
after(async () => { await db?.close(); });
beforeEach(async () => { await db.client.query('TRUNCATE "CatalogVenue", "CatalogArtist" CASCADE'); });
const snapshot = async () => (await db.client.query(`SELECT 'event' kind, id FROM "CatalogEvent" UNION ALL SELECT 'venue', id FROM "CatalogVenue" UNION ALL SELECT 'artist', id FROM "CatalogArtist" UNION ALL SELECT 'ticket', id FROM "CatalogTicketType" UNION ALL SELECT 'seat', id FROM "CatalogSeat" ORDER BY kind,id`)).rows;
test('first seed creates the complete original sample catalog', async () => {
  await seed(db.env);
  assert.equal((await snapshot()).length, 28);
  assert.deepEqual((await db.client.query('SELECT name, "coverImage", status, category FROM "CatalogEvent"')).rows, [{ name: 'Night Signals', coverImage: '/demo/night-signals.svg', status: 'published', category: 'music' }]);
  assert.equal((await db.client.query('SELECT "artistId", headliner FROM "CatalogEventArtist"')).rows[0].artistId, ids.artist);
});
test('repeat seed preserves every ID and row count', async () => {
  await seed(db.env); const first = await snapshot(); await seed(db.env);
  assert.deepEqual(await snapshot(), first);
});
test('published event has future dates and purchasable seats', async () => {
  await seed(db.env);
  const { rows: [row] } = await db.client.query(`SELECT e."startAt", e."doorsOpen", e."endsAt", t."priceCents", t."maxPerOrder", t."seatsAvailable", count(s.id)::int seats FROM "CatalogEvent" e JOIN "CatalogTicketType" t ON t."eventId"=e.id JOIN "CatalogSeat" s ON s."seatMapId"=e."seatMapId" AND s."sectionKey"=t."sectionKey" GROUP BY e.id,t.id`);
  assert.ok(row.startAt > new Date()); assert.ok(row.doorsOpen < row.startAt); assert.ok(row.endsAt > row.startAt);
  assert.deepEqual([row.priceCents, row.maxPerOrder, row.seatsAvailable, row.seats], [4500, 4, 24, 24]);
});
const OWN_VENUE = 'd5000000-0000-4000-8000-000000000010';
const OWN_MAP = 'd5000000-0000-4000-8000-000000000011';
const insertMigrationStyleEvent = async (client, id, date) => {
  await client.query(`INSERT INTO "CatalogVenue" (id,name,address,city,state,country,latitude,longitude,capacity) VALUES ($1,'Other Hall','1 Other St','City','ST','Country',0,0,10) ON CONFLICT (id) DO NOTHING`, [OWN_VENUE]);
  await client.query(`INSERT INTO "CatalogSeatMap" (id,name,layout,"venueId") VALUES ($1,'Other map','{}',$2) ON CONFLICT (id) DO NOTHING`, [OWN_MAP, OWN_VENUE]);
  return insertEvent(client, id, date);
};
const insertEvent = (client, id, date) => client.query(`INSERT INTO "CatalogEvent" (id,type,name,description,"coverImage",date,"startAt","endsAt","doorsOpen",status,category,price,"venueId","seatMapId",tags) VALUES ($1,'concert','Migration Show','x','/x.svg',$2::timestamptz,$2::timestamptz,$2::timestamptz + interval '150 minutes',$2::timestamptz - interval '60 minutes','published','music',10,$3,$4,'')`, [id, date, OWN_VENUE, OWN_MAP]);
test('seed also moves stale events from the migrations forward', async () => {
  await seed(db.env);
  await insertMigrationStyleEvent(db.client, 'd5000000-0000-4000-8000-000000000002', '2026-03-06T20:00:00Z');
  await seed(db.env);
  const { rows: [row] } = await db.client.query('SELECT date FROM "CatalogEvent" WHERE id = $1', ['d5000000-0000-4000-8000-000000000002']);
  assert.ok(row.date > new Date(Date.now() + 6 * 86400000));
  await seed(db.env);
  const again = await db.client.query('SELECT date FROM "CatalogEvent" WHERE id = $1', ['d5000000-0000-4000-8000-000000000002']);
  assert.equal(+again.rows[0].date, +row.date);
});
test('database failure rolls back every catalog write', async () => {
  await db.client.query(`CREATE FUNCTION reject_demo_seat() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER reject_demo_seat BEFORE INSERT ON "CatalogSeat" FOR EACH ROW EXECUTE FUNCTION reject_demo_seat()`);
  try { await assert.rejects(seed(db.env)); assert.deepEqual(await snapshot(), []); }
  finally { await db.client.query('DROP TRIGGER reject_demo_seat ON "CatalogSeat"; DROP FUNCTION reject_demo_seat()'); }
});
