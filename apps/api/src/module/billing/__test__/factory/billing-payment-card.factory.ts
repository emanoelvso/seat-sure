import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A BillingPaymentCard row. The user is a plain id (no FK). The token and the
// fingerprint are random stand-ins, never derived from a card number.
interface BillingPaymentCardRow {
  id: string;
  userId: string;
  provider: string;
  providerToken: string;
  fingerprint: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  isDefault: boolean;
  createdAt?: Date;
}

export const billingPaymentCardFactory =
  Factory.Sync.makeFactory<BillingPaymentCardRow>({
    id: Factory.each(() => faker.string.uuid()),
    userId: Factory.each(() => faker.string.uuid()),
    provider: 'simulated',
    providerToken: Factory.each(() => `sim_pm_${faker.string.uuid()}`),
    fingerprint: Factory.each(() =>
      faker.string.hexadecimal({ length: 64, casing: 'lower', prefix: '' }),
    ),
    brand: 'visa',
    last4: '4242',
    expMonth: 8,
    expYear: 2030,
    holder: 'Ada Lovelace',
    isDefault: false,
  });
