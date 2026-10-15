import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { fixture, gql, untilDecided, START_CHECKOUT } from './common.js';

const winners = new Counter('contention_winners');
const seatsUnavailable = new Counter('contention_seats_unavailable');
const unexpected = new Counter('contention_unexpected');
const serverErrors = new Counter('contention_server_errors');
const busy = new Counter('contention_busy');

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
    contention_busy: ['count>=0'],
  },
};

export default function () {
  const session = fixture.sessions[__VU - 1];

  // Retry startCheckout on BUSY, waiting 100-300 ms between tries
  const { result, outcome, busyCount } = untilDecided(
    () => {
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
      return { status: response.status, body };
    },
    {
      tries: 10,
      wait: () => sleep(0.1 + Math.random() * 0.2),
      expectedReasons: ['SEATS_UNAVAILABLE'],
    },
  );

  busy.add(busyCount);

  // A 5xx is never retried, so the final response carries it
  if (result.status >= 500) {
    serverErrors.add(1);
  }

  // Count based on the final outcome
  if (outcome.kind === 'ok') {
    winners.add(1);
  } else if (outcome.kind === 'expected') {
    seatsUnavailable.add(1);
  } else {
    // unexpected or exhausted
    unexpected.add(1);
  }

  check(result, {
    'a win or SEATS_UNAVAILABLE, never a 5xx': () =>
      (outcome.kind === 'ok' || outcome.kind === 'expected') &&
      result.status < 500,
  });
}
