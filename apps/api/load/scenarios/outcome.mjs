// Pure outcome classifier for k6 scenarios - no k6 imports.
// Used by spike.js, contention.js and scenarios/common.js.

// The business reason of a failed call (ADR-018: extensions.originalError).
export const reasonOf = (body) =>
  body?.errors?.[0]?.extensions?.originalError?.reason ?? null;

export const BUSY = 'BUSY';

// Classify a response as ok, busy, expected or unexpected.
// Input: { status, body } - plain objects, not k6 Response
// Output: { kind, reason }
export const classifyOutcome = ({ status, body }, expectedReasons = []) => {
  // Status >= 500 or body === null → unexpected
  if (status >= 500 || body === null) {
    return { kind: 'unexpected', reason: reasonOf(body) };
  }

  // Status 200 with data and no errors → ok
  if (status === 200 && !body?.errors && Boolean(body?.data)) {
    return { kind: 'ok', reason: null };
  }

  // Get the reason
  const reason = reasonOf(body);

  // BUSY always returns busy, never expected
  if (reason === BUSY) {
    return { kind: 'busy', reason: BUSY };
  }

  // Reason in expectedReasons → expected
  if (expectedReasons.includes(reason)) {
    return { kind: 'expected', reason };
  }

  // Everything else → unexpected
  return { kind: 'unexpected', reason };
};

// Retry attempt() until its outcome is not busy or tries run out.
// attempt() returns { status, body }
// wait() runs between tries and should call sleep() for k6
// Returns { result, outcome, busyCount, exhausted }
export const untilDecided = (
  attempt,
  { tries = 10, wait = () => {}, expectedReasons = [] } = {},
) => {
  let busyCount = 0;
  let result = null;
  let outcome = null;

  for (let i = 0; i < tries; i++) {
    result = attempt();
    outcome = classifyOutcome(result, expectedReasons);

    if (outcome.kind !== 'busy') {
      // Decided: ok, expected, or unexpected
      return { result, outcome, busyCount, exhausted: false };
    }

    // Still busy
    busyCount++;
    if (i < tries - 1) {
      // Wait before retrying (unless this is the last try)
      wait();
    }
  }

  // Exhausted all tries while still busy
  return { result, outcome, busyCount, exhausted: true };
};
