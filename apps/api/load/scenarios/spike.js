import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { fixture, gql, reasonOf, START_CHECKOUT } from './common.js';

// Flash sale: buyers ramp up against one event and each browses, holds a seat
// and pays with the simulated gateway's success card. 60% of the buyers pick
// from a hot set of 50 seats, 40% from the rest; a rejected hold retries once.
// Business losses are expected; 5xx, timeouts and connection errors are not.

const VUS = Number(__ENV.VUS || 2000);
const RAMP_SECONDS = Number(__ENV.RAMP_SECONDS || 10);
const HOLD_SECONDS = Number(__ENV.HOLD_SECONDS || 60);
const HOT_SEATS = 50;
const HOT_SHARE = 0.6;

const unexpected = new Rate('unexpected_errors');
const seatsUnavailable = new Counter('expected_seats_unavailable');
const holdExpired = new Counter('expected_hold_expired');
const sold = new Counter('orders_paid');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${RAMP_SECONDS}s`, target: VUS },
        { duration: `${HOLD_SECONDS}s`, target: VUS },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_duration{op:hold}': [`p(95)<${__ENV.HOLD_P95_MS || 800}`],
    'http_req_duration{op:pay}': [`p(95)<${__ENV.PAY_P95_MS || 1500}`],
    'http_req_duration{op:discovery}': [
      `p(95)<${__ENV.DISCOVERY_P95_MS || 500}`,
    ],
    unexpected_errors: ['rate<0.01'],
    // Never fail: they only make k6 export per-operation figures in the summary.
    ...Object.fromEntries(
      ['discovery', 'hold', 'pay'].flatMap((op) => [
        [`unexpected_errors{op:${op}}`, ['rate>=0']],
        [`http_reqs{op:${op}}`, ['count>=0']],
      ]),
    ),
  },
};

const FIND_EVENT_TICKETS = `query ($input: FindEventTicketsInput!) {
  findEventTickets(FindEventTicketsInput: $input) { ticketTypes { id seatsAvailable } }
}`;
const FIND_UNAVAILABLE_SEATS = `query ($input: FindUnavailableSeatsInput!) {
  findUnavailableSeats(FindUnavailableSeatsInput: $input) { seatIds }
}`;
const PAY_ORDER = `mutation ($input: PayOrderInput!) {
  payOrder(input: $input) { id status }
}`;
const LOG_IN = `mutation ($input: LogInInput!) {
  logIn(input: $input) { session { accessToken } }
}`;

const CARD = {
  number: '4242424242424242',
  holder: 'Load Buyer',
  expiry: '12/40',
  cvv: '123',
};

const hotSeats = fixture.seatIds.slice(0, HOT_SEATS);
const otherSeats = fixture.seatIds.slice(HOT_SEATS);
const pick = (seats) => seats[Math.floor(Math.random() * seats.length)];
const pickSeat = () => pick(Math.random() < HOT_SHARE ? hotSeats : otherSeats);

// The session this virtual user reuses across iterations.
let token = null;

const isUnauthenticated = (response, body) =>
  response.status === 401 ||
  body?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED';

// Signs in again once when the session is rejected; a second rejection is
// reported to the caller as the failing response.
const authed = (query, variables, op) => {
  const session = fixture.sessions[__VU - 1];
  token = token || session.accessToken;
  let result = gql(query, variables, token, { op });
  if (isUnauthenticated(result.response, result.body)) {
    const login = gql(LOG_IN, {
      input: {
        email: session.email,
        password: session.password,
        rememberMe: false,
      },
    });
    token = login.body?.data?.logIn?.session?.accessToken || token;
    result = gql(query, variables, token, { op });
  }
  return result;
};

const holdSeat = (seatId) =>
  authed(
    START_CHECKOUT,
    {
      input: {
        eventId: fixture.eventId,
        ticketTypeId: fixture.ticketTypeId,
        seatIds: [seatId],
      },
    },
    'hold',
  );

// true for a success or an expected business error, false for anything else.
const classify = (result, expectedReasons, op) => {
  const { response, body } = result;
  const ok = response.status === 200 && !body?.errors && Boolean(body?.data);
  const reason = reasonOf(body);
  const expected = !ok && expectedReasons.includes(reason);
  unexpected.add(!ok && !expected, { op });
  return { ok, reason };
};

export default function () {
  // Browse
  for (const [query, variables] of [
    [FIND_EVENT_TICKETS, { input: { eventId: fixture.eventId } }],
    [FIND_UNAVAILABLE_SEATS, { input: { eventId: fixture.eventId } }],
  ]) {
    const { response, body } = gql(query, variables, null, { op: 'discovery' });
    unexpected.add(response.status !== 200 || Boolean(body?.errors), {
      op: 'discovery',
    });
  }
  sleep(0.2 + Math.random() * 0.5);

  // Hold, retrying once with another seat when the first is taken
  let seatId = pickSeat();
  let hold = holdSeat(seatId);
  let outcome = classify(hold, ['SEATS_UNAVAILABLE'], 'hold');
  if (!outcome.ok && outcome.reason === 'SEATS_UNAVAILABLE') {
    seatsUnavailable.add(1);
    seatId = pick(fixture.seatIds.filter((candidate) => candidate !== seatId));
    hold = holdSeat(seatId);
    outcome = classify(hold, ['SEATS_UNAVAILABLE'], 'hold');
    if (!outcome.ok && outcome.reason === 'SEATS_UNAVAILABLE') {
      seatsUnavailable.add(1);
    }
  }
  if (!outcome.ok) {
    sleep(1 + Math.random());
    return;
  }
  sleep(0.2 + Math.random() * 0.5);

  // Pay
  const payment = authed(
    PAY_ORDER,
    {
      input: {
        orderId: hold.body.data.startCheckout.id,
        card: CARD,
        saveCard: false,
      },
    },
    'pay',
  );
  const paid = classify(payment, ['ORDER_EXPIRED'], 'pay');
  if (paid.ok) {
    sold.add(1);
  } else if (paid.reason === 'ORDER_EXPIRED') {
    holdExpired.add(1);
  }
  check(payment, {
    'payment settled or expired': () =>
      paid.ok || paid.reason === 'ORDER_EXPIRED',
  });
  sleep(1 + Math.random());
}
