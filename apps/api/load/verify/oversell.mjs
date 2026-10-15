import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from '../lib/config.mjs';

const SOLD_STATUSES = ['issued', 'used', 'transferred'];

const qualify = (schema, table) => `"${schema}"."${table}"`;

// Database truth about overselling: no seat is ticketed or held twice for an
// event, and live tickets reconcile with successful payments. A successful
// payment pays one order for all its seats and an order is paid at most once,
// so each order holds one live ticket per seat when paid and none otherwise.
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

    const { soldTickets } = (
      await client.query(
        `SELECT count(*)::int AS "soldTickets" FROM ${ticket}
         WHERE status::text = ANY($2) AND ($1::uuid IS NULL OR "eventId" = $1)`,
        [eventId, SOLD_STATUSES],
      )
    ).rows[0];

    // Orders with a successful payment or a live ticket
    const orders = (
      await client.query(
        `WITH payments AS (
           SELECT "orderId", count(*)::int AS count FROM ${payment}
           WHERE status::text = 'succeeded' GROUP BY "orderId"
         ), tickets AS (
           SELECT i."orderId", count(*)::int AS count FROM ${ticket} t
           JOIN ${item} i ON i.id = t."orderItemId"
           WHERE t.status::text = ANY($2) GROUP BY i."orderId"
         )
         SELECT o.id AS "orderId",
                coalesce(p.count, 0) AS "successfulPayments",
                (SELECT count(*)::int FROM ${item} i WHERE i."orderId" = o.id) AS seats,
                coalesce(t.count, 0) AS "liveTickets"
         FROM ${order} o
         LEFT JOIN payments p ON p."orderId" = o.id
         LEFT JOIN tickets t ON t."orderId" = o.id
         WHERE ($1::uuid IS NULL OR o."eventId" = $1)
           AND (p.count IS NOT NULL OR t.count IS NOT NULL)`,
        [eventId, SOLD_STATUSES],
      )
    ).rows;

    // Seats are counted per payment, so an order paid twice counts twice
    const successfulPayments = orders.reduce(
      (sum, o) => sum + o.successfulPayments,
      0,
    );
    const paidSeats = orders.reduce(
      (sum, o) => sum + o.successfulPayments * o.seats,
      0,
    );
    const unbalancedOrders = orders.filter(
      (o) =>
        o.successfulPayments > 1 ||
        o.liveTickets !== o.successfulPayments * o.seats,
    );

    return {
      eventId,
      duplicateTickets,
      duplicateHolds,
      soldTickets,
      successfulPayments,
      paidSeats,
      unbalancedOrders,
      ok:
        duplicateTickets.length === 0 &&
        duplicateHolds.length === 0 &&
        soldTickets === paidSeats &&
        unbalancedOrders.length === 0,
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
