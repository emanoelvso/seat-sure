import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from '../lib/config.mjs';

const SOLD_STATUSES = ['issued', 'used', 'transferred'];

const qualify = (schema, table) => `"${schema}"."${table}"`;

// Database truth about overselling: no seat is ticketed or held twice for an
// event, and the tickets sold match the seats of successfully paid orders.
// Without `eventId` it checks every event.
export const checkOversell = async ({
  databaseUrl,
  eventId = null,
  schema = 'public',
}) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
    throw new Error(`Invalid schema name: ${schema}`);
  }
  const ticket = qualify(schema, 'TicketingTicket');
  const hold = qualify(schema, 'TicketingSeatHold');
  const order = qualify(schema, 'TicketingOrder');
  const item = qualify(schema, 'TicketingOrderItem');
  const payment = qualify(schema, 'BillingPayment');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const duplicates = async (table, where, params) =>
      (
        await client.query(
          `SELECT "eventId", "seatId", count(*)::int AS count FROM ${table}
           WHERE "seatId" IS NOT NULL AND ($1::uuid IS NULL OR "eventId" = $1) ${where}
           GROUP BY "eventId", "seatId" HAVING count(*) > 1`,
          [eventId, ...params],
        )
      ).rows;

    const duplicateTickets = await duplicates(
      ticket,
      `AND status::text = ANY($2)`,
      [SOLD_STATUSES],
    );
    const duplicateHolds = await duplicates(hold, '', []);

    const { rows } = await client.query(
      `SELECT
         (SELECT count(*)::int FROM ${ticket}
           WHERE status::text = ANY($2) AND ($1::uuid IS NULL OR "eventId" = $1)) AS "soldTickets",
         (SELECT count(*)::int FROM ${item} i
           JOIN ${order} o ON o.id = i."orderId"
           WHERE ($1::uuid IS NULL OR o."eventId" = $1)
             AND EXISTS (SELECT 1 FROM ${payment} p
                          WHERE p."orderId" = o.id AND p.status::text = 'succeeded')) AS "paidSeats"`,
      [eventId, SOLD_STATUSES],
    );
    const { soldTickets, paidSeats } = rows[0];

    return {
      eventId,
      duplicateTickets,
      duplicateHolds,
      soldTickets,
      paidSeats,
      ok:
        duplicateTickets.length === 0 &&
        duplicateHolds.length === 0 &&
        soldTickets === paidSeats,
    };
  } finally {
    await client.end();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [eventId, schema] = process.argv.slice(2);
  const result = await checkOversell({
    databaseUrl: loadConfig().databaseUrl,
    eventId: eventId || null,
    schema: schema || 'public',
  });
  console.log(JSON.stringify(result));
  if (!result.ok) {
    console.error('Oversell check failed');
    process.exit(1);
  }
}
