import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import pg from 'pg';
import { seedEvent } from './seed.mjs';

// The local test database, already migrated (pnpm --filter api test:db:reset).
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';

const seeded = [];
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

after(async () => {
  for (const { eventId, ticketTypeId } of seeded) {
    const { rows } = await client.query(
      'SELECT "seatMapId", "venueId" FROM "CatalogEvent" WHERE id = $1',
      [eventId],
    );
    await client.query('DELETE FROM "CatalogTicketType" WHERE id = $1', [
      ticketTypeId,
    ]);
    await client.query('DELETE FROM "CatalogEvent" WHERE id = $1', [eventId]);
    await client.query('DELETE FROM "CatalogSeat" WHERE "seatMapId" = $1', [
      rows[0].seatMapId,
    ]);
    await client.query('DELETE FROM "CatalogSeatMap" WHERE id = $1', [
      rows[0].seatMapId,
    ]);
    await client.query('DELETE FROM "CatalogVenue" WHERE id = $1', [
      rows[0].venueId,
    ]);
  }
  await client.end();
});

test('creates a published event with a 500-seat ticket type', async () => {
  const result = await seedEvent({ databaseUrl });
  seeded.push(result);

  assert.equal(result.seatIds.length, 500);
  assert.equal(new Set(result.seatIds).size, 500);

  const { rows: events } = await client.query(
    `SELECT status, "seatMapId" FROM "CatalogEvent" WHERE id = $1`,
    [result.eventId],
  );
  assert.equal(events[0].status, 'published');

  const { rows: ticketTypes } = await client.query(
    `SELECT "eventId", "seatsAvailable" FROM "CatalogTicketType" WHERE id = $1`,
    [result.ticketTypeId],
  );
  assert.equal(ticketTypes[0].eventId, result.eventId);
  assert.equal(ticketTypes[0].seatsAvailable, 500);

  const { rows: seats } = await client.query(
    `SELECT id FROM "CatalogSeat" WHERE "seatMapId" = $1`,
    [events[0].seatMapId],
  );
  assert.deepEqual(
    seats.map((seat) => seat.id).sort(),
    [...result.seatIds].sort(),
  );
});

test('creates a new event on every call', async () => {
  const first = await seedEvent({ databaseUrl });
  const second = await seedEvent({ databaseUrl });
  seeded.push(first, second);

  assert.notEqual(first.eventId, second.eventId);
  assert.notEqual(first.ticketTypeId, second.ticketTypeId);
  assert.equal(
    first.seatIds.some((id) => second.seatIds.includes(id)),
    false,
  );
});
