import {
  classifyOutcome,
  reasonOf,
  BUSY,
  untilDecided,
} from '../../scenarios/outcome.mjs';

describe('reasonOf', () => {
  it('extracts reason from errors[0].extensions.originalError.reason', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: 'SEATS_UNAVAILABLE' },
          },
        },
      ],
    };
    expect(reasonOf(body)).toBe('SEATS_UNAVAILABLE');
  });

  it('returns null when body is null', () => {
    expect(reasonOf(null)).toBeNull();
  });

  it('returns null when there are no errors', () => {
    expect(reasonOf({ data: {} })).toBeNull();
  });

  it('returns null when the reason is absent', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: {},
          },
        },
      ],
    };
    expect(reasonOf(body)).toBeNull();
  });
});

describe('classifyOutcome', () => {
  it('AC1: status 200 with data and no errors returns ok', () => {
    const result = classifyOutcome({
      status: 200,
      body: { data: { id: '123' } },
    });
    expect(result).toEqual({ kind: 'ok', reason: null });
  });

  it('AC2: status 200 with BUSY reason returns busy', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: BUSY },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body }, ['ORDER_EXPIRED']);
    expect(result).toEqual({ kind: 'busy', reason: BUSY });
  });

  it('AC2 edge case: BUSY returns busy even if BUSY is in expectedReasons', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: BUSY },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body }, [
      BUSY,
      'ORDER_EXPIRED',
    ]);
    expect(result).toEqual({ kind: 'busy', reason: BUSY });
  });

  it('AC3: status 200 with expected reason returns expected with that reason', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: 'SEATS_UNAVAILABLE' },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body }, [
      'SEATS_UNAVAILABLE',
    ]);
    expect(result).toEqual({ kind: 'expected', reason: 'SEATS_UNAVAILABLE' });
  });

  it('AC4: status 200 with unexpected reason returns unexpected', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: 'SEATS_UNAVAILABLE' },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body }, []);
    expect(result).toEqual({ kind: 'unexpected', reason: 'SEATS_UNAVAILABLE' });
  });

  it('AC4: status 502 returns unexpected even with BUSY reason', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: BUSY },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 502, body }, []);
    expect(result).toEqual({ kind: 'unexpected', reason: BUSY });
  });

  it('AC4 edge case: body null returns unexpected with reason null', () => {
    const result = classifyOutcome({ status: 200, body: null });
    expect(result).toEqual({ kind: 'unexpected', reason: null });
  });

  it('AC4 edge case: status 200 with errors but no reason returns unexpected', () => {
    const body = {
      errors: [
        {
          message: 'Something went wrong',
          extensions: {},
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body });
    expect(result).toEqual({ kind: 'unexpected', reason: null });
  });

  it('AC4: status 500 returns unexpected', () => {
    const body = { data: { id: '123' } };
    const result = classifyOutcome({ status: 500, body });
    expect(result).toEqual({ kind: 'unexpected', reason: null });
  });

  it('AC4: status 500 with a BUSY reason returns unexpected', () => {
    const body = {
      errors: [{ extensions: { originalError: { reason: BUSY } } }],
    };
    expect(classifyOutcome({ status: 500, body })).toEqual({
      kind: 'unexpected',
      reason: BUSY,
    });
  });

  it('AC4: status 500 with an expected reason returns unexpected', () => {
    const body = {
      errors: [
        { extensions: { originalError: { reason: 'SEATS_UNAVAILABLE' } } },
      ],
    };
    expect(
      classifyOutcome({ status: 500, body }, ['SEATS_UNAVAILABLE']),
    ).toEqual({ kind: 'unexpected', reason: 'SEATS_UNAVAILABLE' });
  });

  it('AC1: status 200 with no data and no errors is not ok', () => {
    expect(classifyOutcome({ status: 200, body: {} })).toEqual({
      kind: 'unexpected',
      reason: null,
    });
  });

  it('AC1: status 400 with data and no errors is not ok', () => {
    const body = { data: { id: '123' } };
    expect(classifyOutcome({ status: 400, body }).kind).toBe('unexpected');
  });

  it('returns unexpected by default when no expectedReasons passed', () => {
    const body = {
      errors: [
        {
          extensions: {
            originalError: { reason: 'SOME_ERROR' },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body });
    expect(result).toEqual({ kind: 'unexpected', reason: 'SOME_ERROR' });
  });

  it('status 200 with data field but also errors returns unexpected', () => {
    const body = {
      data: { id: '123' },
      errors: [
        {
          extensions: {
            originalError: { reason: 'SOME_ERROR' },
          },
        },
      ],
    };
    const result = classifyOutcome({ status: 200, body }, [
      'SEATS_UNAVAILABLE',
    ]);
    expect(result).toEqual({ kind: 'unexpected', reason: 'SOME_ERROR' });
  });
});

describe('BUSY constant', () => {
  it('exports BUSY as a string', () => {
    expect(typeof BUSY).toBe('string');
    expect(BUSY).toBe('BUSY');
  });
});

describe('untilDecided', () => {
  it('AC1: ok on first try returns 1 attempt, 0 waits, busyCount 0', () => {
    let attemptCount = 0;
    let waitCount = 0;
    const attempt = () => {
      attemptCount++;
      return { status: 200, body: { data: { id: '123' } } };
    };
    const wait = () => {
      waitCount++;
    };

    const result = untilDecided(attempt, { tries: 10, wait });

    expect(attemptCount).toBe(1);
    expect(waitCount).toBe(0);
    expect(result.busyCount).toBe(0);
    expect(result.outcome).toEqual({ kind: 'ok', reason: null });
    expect(result.exhausted).toBe(false);
    expect(result.result).toEqual({
      status: 200,
      body: { data: { id: '123' } },
    });
  });

  it('AC1,AC2: BUSY, BUSY, SEATS_UNAVAILABLE returns 3 attempts, 2 waits, busyCount 2, outcome expected, exhausted false', () => {
    const responses = [
      {
        status: 200,
        body: { errors: [{ extensions: { originalError: { reason: BUSY } } }] },
      },
      {
        status: 200,
        body: { errors: [{ extensions: { originalError: { reason: BUSY } } }] },
      },
      {
        status: 200,
        body: {
          errors: [
            { extensions: { originalError: { reason: 'SEATS_UNAVAILABLE' } } },
          ],
        },
      },
    ];
    let attemptCount = 0;
    let waitCount = 0;
    const attempt = () => responses[attemptCount++];
    const wait = () => {
      waitCount++;
    };

    const result = untilDecided(attempt, {
      tries: 10,
      wait,
      expectedReasons: ['SEATS_UNAVAILABLE'],
    });

    expect(attemptCount).toBe(3);
    expect(waitCount).toBe(2);
    expect(result.busyCount).toBe(2);
    expect(result.outcome).toEqual({
      kind: 'expected',
      reason: 'SEATS_UNAVAILABLE',
    });
    expect(result.exhausted).toBe(false);
    expect(result.result).toBe(responses[2]);
  });

  it('AC3: BUSY every time with tries 10 returns exactly 10 attempts, 9 waits, busyCount 10, exhausted true', () => {
    let attemptCount = 0;
    let waitCount = 0;
    const attempt = () => {
      attemptCount++;
      return {
        status: 200,
        body: { errors: [{ extensions: { originalError: { reason: BUSY } } }] },
      };
    };
    const wait = () => {
      waitCount++;
    };

    const result = untilDecided(attempt, { tries: 10, wait });

    expect(attemptCount).toBe(10);
    expect(waitCount).toBe(9);
    expect(result.busyCount).toBe(10);
    expect(result.outcome).toEqual({ kind: 'busy', reason: BUSY });
    expect(result.exhausted).toBe(true);
    expect(result.result.status).toBe(200);
    expect(reasonOf(result.result.body)).toBe(BUSY);
  });

  it('unexpected result stops at once without retrying', () => {
    let attemptCount = 0;
    let waitCount = 0;
    const attempt = () => {
      attemptCount++;
      return {
        status: 200,
        body: {
          errors: [
            { extensions: { originalError: { reason: 'UNKNOWN_ERROR' } } },
          ],
        },
      };
    };
    const wait = () => {
      waitCount++;
    };

    const result = untilDecided(attempt, {
      tries: 10,
      wait,
      expectedReasons: ['SEATS_UNAVAILABLE'],
    });

    expect(attemptCount).toBe(1);
    expect(waitCount).toBe(0);
    expect(result.busyCount).toBe(0);
    expect(result.outcome).toEqual({
      kind: 'unexpected',
      reason: 'UNKNOWN_ERROR',
    });
    expect(result.exhausted).toBe(false);
  });

  it('uses default tries of 10 when not specified', () => {
    let attemptCount = 0;
    const attempt = () => {
      attemptCount++;
      return {
        status: 200,
        body: { errors: [{ extensions: { originalError: { reason: BUSY } } }] },
      };
    };
    const wait = () => {};

    untilDecided(attempt, { wait });

    expect(attemptCount).toBe(10);
  });

  it('uses default no-op wait when not specified', () => {
    let attemptCount = 0;
    const attempt = () => {
      attemptCount++;
      return { status: 200, body: { data: { id: '123' } } };
    };

    const result = untilDecided(attempt, { tries: 1 });

    expect(result.outcome).toEqual({ kind: 'ok', reason: null });
  });
});
