import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { checkOversell } from '../../verify/oversell.mjs';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';
const script = fileURLToPath(
  new URL('../../verify/oversell.mjs', import.meta.url),
);

const db = new pg.Client({ connectionString: databaseUrl });
const schemas = [];

// Constraint-free copies of the columns the check reads, in a throwaway
// schema, so duplicates and unlinked rows can be inserted (the real tables
// reject them).
const createFixtureSchema = async () => {
  const schema = `oversell_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  schemas.push(schema);
  await db.query(`CREATE SCHEMA "${schema}"`);
  await db.query(
    `CREATE TABLE "${schema}"."TicketingTicket" ("eventId" uuid, "seatId" uuid, status text, "orderItemId" uuid)`,
  );
  await db.query(
    `CREATE TABLE "${schema}"."TicketingSeatHold" ("eventId" uuid, "seatId" uuid)`,
  );
  await db.query(
    `CREATE TABLE "${schema}"."TicketingOrder" (id uuid, "eventId" uuid)`,
  );
  await db.query(
    `CREATE TABLE "${schema}"."TicketingOrderItem" (id uuid, "orderId" uuid, "seatId" uuid)`,
  );
  await db.query(
    `CREATE TABLE "${schema}"."BillingPayment" ("orderId" uuid, status text)`,
  );
  return schema;
};

const fixture = (schema) => {
  // An order with one item per seat; `seatId` puts every item on that seat
  const insertOrder = async (eventId, seatCount, seatId) => {
    const order = { id: randomUUID(), eventId, items: [] };
    await db.query(
      `INSERT INTO "${schema}"."TicketingOrder" (id, "eventId") VALUES ($1, $2)`,
      [order.id, eventId],
    );
    for (let i = 0; i < seatCount; i++) {
      const item = { id: randomUUID(), seatId: seatId ?? randomUUID() };
      await db.query(
        `INSERT INTO "${schema}"."TicketingOrderItem" (id, "orderId", "seatId") VALUES ($1, $2, $3)`,
        [item.id, order.id, item.seatId],
      );
      order.items.push(item);
    }
    return order;
  };

  const insertPayment = (orderId, status) =>
    db.query(
      `INSERT INTO "${schema}"."BillingPayment" ("orderId", status) VALUES ($1, $2)`,
      [orderId, status],
    );

  const insertTicket = (eventId, seatId, orderItemId, status = 'issued') =>
    db.query(
      `INSERT INTO "${schema}"."TicketingTicket" ("eventId", "seatId", status, "orderItemId") VALUES ($1, $2, $3, $4)`,
      [eventId, seatId, status, orderItemId],
    );

  // Live tickets for the first `count` items of an order
  const issueTickets = async (order, count = order.items.length) => {
    for (const item of order.items.slice(0, count)) {
      await insertTicket(order.eventId, item.seatId, item.id);
    }
  };

  // A fully paid order: one successful payment and a ticket per seat
  const insertPaidOrder = async (eventId, seatCount, seatId) => {
    const order = await insertOrder(eventId, seatCount, seatId);
    await insertPayment(order.id, 'succeeded');
    await issueTickets(order);
    return order;
  };

  return {
    insertOrder,
    insertPayment,
    insertTicket,
    issueTickets,
    insertPaidOrder,
  };
};

describe('checkOversell', () => {
  let schema;
  let insertOrder;
  let insertPayment;
  let insertTicket;
  let issueTickets;
  let insertPaidOrder;

  const check = (eventId) => checkOversell({ databaseUrl, eventId, schema });

  const runCli = (eventId) =>
    new Promise((resolve) => {
      execFile(
        process.execPath,
        [script, eventId, schema],
        { env: { ...process.env, LOAD_DATABASE_URL: databaseUrl } },
        (error) => resolve(error ? error.code : 0),
      );
    });

  beforeAll(async () => {
    await db.connect();
    schema = await createFixtureSchema();
    ({
      insertOrder,
      insertPayment,
      insertTicket,
      issueTickets,
      insertPaidOrder,
    } = fixture(schema));
  });

  afterAll(async () => {
    for (const name of schemas) {
      await db.query(`DROP SCHEMA "${name}" CASCADE`);
    }
    await db.end();
  });

  it('a 3-seat order paid once after a failed attempt passes and exits 0', async () => {
    const eventId = randomUUID();
    const order = await insertOrder(eventId, 3);
    await insertPayment(order.id, 'failed');
    await insertPayment(order.id, 'succeeded');
    await issueTickets(order);

    const result = await check(eventId);
    expect(result).toMatchObject({
      ok: true,
      soldTickets: 3,
      successfulPayments: 1,
      paidSeats: 3,
      unbalancedOrders: [],
    });
    expect(await runCli(eventId)).toBe(0);
  });

  it('a paid order with fewer live tickets than seats fails and exits 1', async () => {
    const eventId = randomUUID();
    const order = await insertOrder(eventId, 3);
    await insertPayment(order.id, 'succeeded');
    await issueTickets(order, 2);

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.unbalancedOrders).toEqual([
      { orderId: order.id, successfulPayments: 1, seats: 3, liveTickets: 2 },
    ]);
    expect(await runCli(eventId)).toBe(1);
  });

  it('an order with two successful payments fails and counts both payments', async () => {
    const eventId = randomUUID();
    const order = await insertOrder(eventId, 2);
    await insertPayment(order.id, 'succeeded');
    await insertPayment(order.id, 'succeeded');
    await issueTickets(order);

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.successfulPayments).toBe(2);
    expect(result.paidSeats).toBe(4);
    expect(result.unbalancedOrders).toEqual([
      { orderId: order.id, successfulPayments: 2, seats: 2, liveTickets: 2 },
    ]);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a live ticket on an order without a successful payment fails', async () => {
    const eventId = randomUUID();
    const order = await insertOrder(eventId, 1);
    await insertPayment(order.id, 'failed');
    await issueTickets(order);

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.unbalancedOrders).toEqual([
      { orderId: order.id, successfulPayments: 0, seats: 1, liveTickets: 1 },
    ]);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a missing ticket and an unpaid ticket that cancel out in the totals fail', async () => {
    const eventId = randomUUID();
    const paid = await insertOrder(eventId, 2);
    await insertPayment(paid.id, 'succeeded');
    await issueTickets(paid, 1);
    const unpaid = await insertOrder(eventId, 1);
    await issueTickets(unpaid);

    const result = await check(eventId);
    expect(result.soldTickets).toBe(2);
    expect(result.paidSeats).toBe(2);
    expect(result.ok).toBe(false);
    expect(result.unbalancedOrders).toHaveLength(2);
    expect(result.unbalancedOrders).toEqual(
      expect.arrayContaining([
        { orderId: paid.id, successfulPayments: 1, seats: 2, liveTickets: 1 },
        { orderId: unpaid.id, successfulPayments: 0, seats: 1, liveTickets: 1 },
      ]),
    );
    expect(await runCli(eventId)).toBe(1);
  });

  it('a live ticket with no order item fails on the totals', async () => {
    const eventId = randomUUID();
    await insertTicket(eventId, randomUUID(), null);

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.soldTickets).toBe(1);
    expect(result.paidSeats).toBe(0);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a refunded payment of an order with no live ticket counts nothing and passes', async () => {
    const eventId = randomUUID();
    const order = await insertOrder(eventId, 2);
    await insertPayment(order.id, 'refunded');

    expect(await check(eventId)).toMatchObject({
      ok: true,
      soldTickets: 0,
      successfulPayments: 0,
      paidSeats: 0,
      unbalancedOrders: [],
    });
  });

  it('a duplicate live ticket for one seat fails and exits 1', async () => {
    const eventId = randomUUID();
    const seatId = randomUUID();
    await insertPaidOrder(eventId, 1, seatId);
    await insertPaidOrder(eventId, 1, seatId);

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.duplicateTickets).toEqual([{ eventId, seatId, count: 2 }]);
    expect(result.unbalancedOrders).toEqual([]);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a duplicate hold for one seat fails and exits 1', async () => {
    const eventId = randomUUID();
    const seatId = randomUUID();
    for (let i = 0; i < 2; i++) {
      await db.query(
        `INSERT INTO "${schema}"."TicketingSeatHold" ("eventId", "seatId") VALUES ($1, $2)`,
        [eventId, seatId],
      );
    }

    const result = await check(eventId);
    expect(result.ok).toBe(false);
    expect(result.duplicateHolds).toEqual([{ eventId, seatId, count: 2 }]);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a cancelled ticket beside a live one for a seat is not a duplicate', async () => {
    const eventId = randomUUID();
    const order = await insertPaidOrder(eventId, 1);
    await insertTicket(eventId, order.items[0].seatId, null, 'cancelled');

    expect(await check(eventId)).toMatchObject({
      ok: true,
      duplicateTickets: [],
      soldTickets: 1,
      paidSeats: 1,
    });
  });

  it('a successful payment for an order that does not exist is not counted', async () => {
    const eventId = randomUUID();
    await insertPaidOrder(eventId, 1);
    await insertPayment(randomUUID(), 'succeeded');

    expect(await check(eventId)).toMatchObject({
      ok: true,
      successfulPayments: 1,
      paidSeats: 1,
    });
  });

  it('without an event it reconciles every event', async () => {
    const own = await createFixtureSchema();
    const {
      insertOrder: insertOwnOrder,
      issueTickets: issueOwnTickets,
      insertPaidOrder: insertOwnPaidOrder,
    } = fixture(own);
    await insertOwnPaidOrder(randomUUID(), 2);
    await insertOwnPaidOrder(randomUUID(), 3);

    expect(
      await checkOversell({ databaseUrl, eventId: null, schema: own }),
    ).toMatchObject({
      ok: true,
      soldTickets: 5,
      successfulPayments: 2,
      paidSeats: 5,
    });

    const unpaid = await insertOwnOrder(randomUUID(), 1);
    await issueOwnTickets(unpaid);

    const result = await checkOversell({
      databaseUrl,
      eventId: null,
      schema: own,
    });
    expect(result.ok).toBe(false);
    expect(result.unbalancedOrders).toEqual([
      { orderId: unpaid.id, successfulPayments: 0, seats: 1, liveTickets: 1 },
    ]);
  });

  it('the real tables answer the check for an event with no orders', async () => {
    const eventId = randomUUID();
    expect(await checkOversell({ databaseUrl, eventId })).toEqual({
      eventId,
      duplicateTickets: [],
      duplicateHolds: [],
      soldTickets: 0,
      successfulPayments: 0,
      paidSeats: 0,
      unbalancedOrders: [],
      ok: true,
    });
  });
});
