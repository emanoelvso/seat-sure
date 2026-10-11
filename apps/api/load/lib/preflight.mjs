import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';

const TIMEOUT_MS = 5000;

// Resolves when the API answers a GraphQL `{ __typename }`; throws with the
// URL it tried otherwise.
export const preflight = async (baseUrl) => {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.json();
    if (!response.ok || body?.data?.__typename === undefined) {
      throw new Error(`unexpected response (HTTP ${response.status})`);
    }
  } catch (error) {
    throw new Error(`API is not reachable at ${baseUrl}: ${error.message}`, {
      cause: error,
    });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await preflight(loadConfig().baseUrl);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
