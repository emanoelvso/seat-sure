import { demoCardError } from '@billingModule/core/util/demo-card-rules';

// Checkout and saved-card entry both call this rule (REL-22).
describe('demoCardError (REL-22)', () => {
  it.each(['4242424242424242', '4000000000000002', '4000000000000341'])(
    'accepts the documented simulator number %s, with or without spaces',
    (number) => {
      expect(demoCardError(number, true)).toBe('');
      expect(demoCardError(number.replace(/(\d{4})(?=\d)/g, '$1 '), true)).toBe(
        '',
      );
    },
  );

  it.each([
    '4111111111111111',
    '4242424242424243',
    '4000000000000010',
    '4000000000000342',
    '4000000000000069',
    '5555555555554444',
  ])('rejects the non-simulator number %s in demo mode', (number) => {
    expect(demoCardError(number, true)).toBe(
      'Use a documented simulator test card.',
    );
  });

  it('allows any number when demo mode is off', () => {
    expect(demoCardError('4111111111111111', false)).toBe('');
  });
});
