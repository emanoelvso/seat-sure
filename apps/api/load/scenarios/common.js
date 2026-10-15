import http from 'k6/http';
import { reasonOf, BUSY, classifyOutcome, untilDecided } from './outcome.mjs';

// Loaded by every scenario. The fixture is written by load/run.mjs: the API
// URL as the container sees it, the seeded event and one session per buyer.
export const fixture = JSON.parse(open('/run/fixture.json'));

export const START_CHECKOUT = `mutation ($input: StartCheckoutInput!) {
  startCheckout(input: $input) { id status }
}`;

export const gql = (query, variables, token, tags) => {
  const response = http.post(
    fixture.baseUrl,
    JSON.stringify({ query, variables }),
    {
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      tags,
    },
  );
  let body = null;
  try {
    body = response.json();
  } catch (_) {
    // A non-JSON answer (gateway error, reset) is classified as unexpected.
  }
  return { response, body };
};

// Re-export the outcome classifier and helpers from outcome.mjs
export { reasonOf, BUSY, classifyOutcome, untilDecided };
