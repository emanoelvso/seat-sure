export interface BillingCardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export type BillingCardFieldErrors = Record<
  'number' | 'holder' | 'expiry' | 'cvv',
  string
>;

// What a charge draws from: a typed card, or one of the user's saved cards
export type ChargeSource =
  | { type: 'card'; card: BillingCardInput }
  | { type: 'savedCard'; savedCardId: string };

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  source: ChargeSource;
}

// `card_not_found`: the saved card isn't the user's or no longer exists.
// Nothing was charged and no payment was recorded.
export type ChargeOutcome =
  | { status: 'succeeded' | 'failed'; paymentId: string }
  | { status: 'card_not_found' };

export interface BillingPaymentCard {
  brand: string;
  last4: string;
}

export interface BillingApi {
  validateCard(
    card: BillingCardInput,
    now: Date,
  ): Promise<BillingCardFieldErrors>;
  charge(input: ChargeDto): Promise<ChargeOutcome>;
  refund(paymentId: string): Promise<void>;
  findPaymentCard(paymentId: string): Promise<BillingPaymentCard | null>;
}

export const BillingApi = Symbol('BillingApi');
