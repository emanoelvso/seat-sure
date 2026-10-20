import { normalizeNumber } from '@billingModule/core/util/card-rules';

const DEMO_CARD_NUMBERS = new Set([
  '4242424242424242',
  '4000000000000002',
  '4000000000000341',
  '4000002760003184',
]);

export const demoCardError = (number: string, demoEnabled: boolean): string =>
  demoEnabled && !DEMO_CARD_NUMBERS.has(normalizeNumber(number))
    ? 'Use a documented simulator test card.'
    : '';
