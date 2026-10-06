import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { PaymentStatus } from '@billingModule/core/enum/payment-status.enum';

// A BillingPayment row. User and order are plain ids (no FK).
interface BillingPaymentRow {
  id: string;
  userId: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  cardBrand: string;
  cardLast4: string;
  failureReason?: string | null;
  refundedAt?: Date | null;
}

export const billingPaymentFactory =
  Factory.Sync.makeFactory<BillingPaymentRow>({
    id: Factory.each(() => faker.string.uuid()),
    userId: Factory.each(() => faker.string.uuid()),
    orderId: Factory.each(() => faker.string.uuid()),
    provider: 'simulated',
    providerPaymentId: Factory.each(
      () => `sim_${faker.string.alphanumeric(12)}`,
    ),
    amountCents: 110700,
    currency: 'USD',
    status: PaymentStatus.SUCCEEDED,
    cardBrand: 'visa',
    cardLast4: '4242',
  });
