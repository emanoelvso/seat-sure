import { randomUUID } from 'node:crypto';
import pg from 'pg';

const SECTION_KEY = 'vip';
const SEATS_PER_ROW = 20;
const DAY_MS = 24 * 3_600_000;

const seatLayout = {
  viewBox: { width: 704, height: 704 },
  labelStyle: { size: 24, weight: 700 },
  stage: {
    label: 'STAGE',
    labelAt: [352, 50],
    shapes: [{ path: 'M100 0L604 0L604 100L100 100Z', color: '#999999' }],
  },
  sections: [
    {
      key: SECTION_KEY,
      label: 'VIP',
      color: '#454545',
      shapes: [
        {
          path: 'M152 300A200 200 0 1 0 552 300A200 200 0 1 0 152 300Z',
          labelAt: [352, 500],
          labelRotation: 0,
        },
      ],
    },
  ],
};

// Creates a fresh published event with one ticket type and `seatCount`
// seats on its own seat map, straight in the catalog tables: the API has no
// mutation for ticket types or seats. Every call gets new ids, so earlier
// runs never affect a new one.
export const seedEvent = async ({ databaseUrl, seatCount = 500 }) => {
  const venueId = randomUUID();
  const seatMapId = randomUUID();
  const eventId = randomUUID();
  const ticketTypeId = randomUUID();
  const seatIds = Array.from({ length: seatCount }, () => randomUUID());
  const startAt = new Date(Date.now() + 30 * DAY_MS);
  const day = (offsetMs) => new Date(startAt.getTime() + offsetMs);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "CatalogVenue" (id, name, address, city, state, country, latitude, longitude, capacity)
       VALUES ($1, $2, 'Load Street 1', 'Sao Paulo', 'SP', 'Brazil', -23.5, -46.6, $3)`,
      [venueId, `Load Venue ${venueId.slice(0, 8)}`, seatCount],
    );
    await client.query(
      `INSERT INTO "CatalogSeatMap" (id, name, layout, "venueId") VALUES ($1, $2, $3, $4)`,
      [
        seatMapId,
        `Load Map ${seatMapId.slice(0, 8)}`,
        JSON.stringify(seatLayout),
        venueId,
      ],
    );
    await client.query(
      `INSERT INTO "CatalogEvent" (id, type, name, description, "coverImage", date, "startAt", "endsAt", "doorsOpen", status, category, price, "venueId", "seatMapId")
       VALUES ($1, 'concert', $2, 'Flash-sale load test event', 'https://example.com/load.jpg', $3, $3, $4, $5, 'published', 'load', 100, $6, $7)`,
      [
        eventId,
        `Load Event ${eventId.slice(0, 8)}`,
        startAt,
        day(3 * 3_600_000),
        day(-3_600_000),
        venueId,
        seatMapId,
      ],
    );
    await client.query(
      `INSERT INTO "CatalogTicketType" (id, "eventId", "sectionKey", name, "priceCents", "serviceFeeCents", "taxCents", currency, "seatsAvailable", "maxPerOrder", tags)
       VALUES ($1, $2, $3, 'VIP', 10000, 500, 0, 'USD', $4, 4, 'load')`,
      [ticketTypeId, eventId, SECTION_KEY, seatCount],
    );
    await client.query(
      `INSERT INTO "CatalogSeat" (id, "seatMapId", "sectionKey", row, number, x, y)
       SELECT ids.id, $2, $3, (($4::int[])[ids.i] )::text, lpad((($5::int[])[ids.i])::text, 2, '0'), ids.i, ids.i
       FROM unnest($1::uuid[]) WITH ORDINALITY AS ids(id, i)`,
      [
        seatIds,
        seatMapId,
        SECTION_KEY,
        seatIds.map((_, index) => Math.floor(index / SEATS_PER_ROW) + 1),
        seatIds.map((_, index) => (index % SEATS_PER_ROW) + 1),
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  return { eventId, ticketTypeId, seatIds };
};
