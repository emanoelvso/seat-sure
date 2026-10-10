import { BillingPaymentCard } from '@billingModule/persistence/entity/billing-payment-card.entity';

// A saved card as clients see it: never the token or the fingerprint
// (CARD-02 AC 10)
export interface PaymentCardModel {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  isDefault: boolean;
  expired: boolean;
}

// Expired once its expiry month is before the current UTC month; the expiry
// month itself still counts as valid (CARD-01 AC 6)
export const isCardExpired = (
  card: Pick<BillingPaymentCard, 'expMonth' | 'expYear'>,
  now: Date,
): boolean =>
  card.expYear * 12 + (card.expMonth - 1) <
  now.getUTCFullYear() * 12 + now.getUTCMonth();

export const toPaymentCardModel = (
  card: BillingPaymentCard,
  now: Date,
): PaymentCardModel => ({
  id: card.id,
  brand: card.brand,
  last4: card.last4,
  expMonth: card.expMonth,
  expYear: card.expYear,
  holder: card.holder,
  isDefault: card.isDefault,
  expired: isCardExpired(card, now),
});
