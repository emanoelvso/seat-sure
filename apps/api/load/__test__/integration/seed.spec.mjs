import pg from 'pg';
import { seedEvent } from '../../lib/seed.mjs';

// The local test database, already migrated (pnpm --filter api test:db:reset).
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';

describe('seedEvent', () => {
  const seeded = [];
  const client = new pg.Client({ connectionString: databaseUrl });

  beforeAll(() => client.connect());

  afterAll(async () => {
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

  it('creates a published event with a 500-seat ticket type', async () => {
    const result = await seedEvent({ databaseUrl });
    seeded.push(result);

    expect(result.seatIds).toHaveLength(500);
    expect(new Set(result.seatIds).size).toBe(500);

    const { rows: events } = await client.query(
      `SELECT status, "seatMapId" FROM "CatalogEvent" WHERE id = $1`,
      [result.eventId],
    );
    expect(events[0].status).toBe('published');

    const { rows: ticketTypes } = await client.query(
      `SELECT "eventId", "seatsAvailable" FROM "CatalogTicketType" WHERE id = $1`,
      [result.ticketTypeId],
    );
    expect(ticketTypes[0].eventId).toBe(result.eventId);
    expect(ticketTypes[0].seatsAvailable).toBe(500);

    const { rows: seats } = await client.query(
      `SELECT id FROM "CatalogSeat" WHERE "seatMapId" = $1`,
      [events[0].seatMapId],
    );
    expect(seats.map((seat) => seat.id).sort()).toEqual(
      [...result.seatIds].sort(),
    );
  });

  it('creates a new event on every call', async () => {
    const first = await seedEvent({ databaseUrl });
    const second = await seedEvent({ databaseUrl });
    seeded.push(first, second);

    expect(first.eventId).not.toBe(second.eventId);
    expect(first.ticketTypeId).not.toBe(second.ticketTypeId);
    expect(first.seatIds.some((id) => second.seatIds.includes(id))).toBe(false);
  });
});
