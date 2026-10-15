import { classifyOutcome, reasonOf, BUSY } from '../../scenarios/outcome.mjs';

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
