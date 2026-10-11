import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { fixture, gql, reasonOf, START_CHECKOUT } from './common.js';

const winners = new Counter('contention_winners');
const seatsUnavailable = new Counter('contention_seats_unavailable');
const unexpected = new Counter('contention_unexpected');
const serverErrors = new Counter('contention_server_errors');

const buyers = fixture.sessions.length;

// All buyers start together and call startCheckout for the same seat.
export const options = {
  scenarios: {
    contention: {
      executor: 'per-vu-iterations',
      vus: buyers,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    contention_winners: ['count==1'],
    contention_seats_unavailable: [`count==${buyers - 1}`],
    contention_unexpected: ['count==0'],
    contention_server_errors: ['count==0'],
  },
};

export default function () {
  const session = fixture.sessions[__VU - 1];
  const { response, body } = gql(
    START_CHECKOUT,
    {
      input: {
        eventId: fixture.eventId,
        ticketTypeId: fixture.ticketTypeId,
        seatIds: [fixture.seatIds[0]],
      },
    },
    session.accessToken,
  );

  const won = response.status === 200 && Boolean(body?.data?.startCheckout?.id);
  const lost = reasonOf(body) === 'SEATS_UNAVAILABLE';
  if (response.status >= 500) {
    serverErrors.add(1);
  }
  if (won) {
    winners.add(1);
  } else if (lost) {
    seatsUnavailable.add(1);
  } else {
    unexpected.add(1);
  }
  check(response, {
    'a win or SEATS_UNAVAILABLE, never a 5xx': () =>
      (won || lost) && response.status < 500,
  });
}
