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
  | { type: 'savedCard'; savedCardId: string }
  // A Stripe PaymentMethod id made in the browser (GW-41)
  | { type: 'paymentMethod'; paymentMethodId: string };

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  source: ChargeSource;
  // Save the typed card once the payment is captured (CARD-09, GW-50)
  saveCard?: boolean;
}

// What the buyer's browser needs to finish a 3-D Secure challenge
export interface PaymentAction {
  provider: 'simulated' | 'stripe';
  clientSecret: string;
}

// `authorized`: the money is held, not yet captured.
// `requires_action`: the buyer must complete `action` first (3-D Secure).
// `card_not_found`: the saved card isn't the user's or no longer exists.
// Nothing was charged and no payment was recorded.
// `card_attempts_limited`: too many failed card attempts (AD-028); nothing
// was charged and no payment was recorded.
export type ChargeOutcome =
  | { status: 'authorized' | 'failed'; paymentId: string }
  | { status: 'requires_action'; paymentId: string; action: PaymentAction }
  | { status: 'card_not_found' }
  | { status: 'card_attempts_limited' };

// Where a challenged payment stands once the buyer is back
export type SettleOutcome =
  | { status: 'authorized' | 'failed' }
  | { status: 'requires_action'; action: PaymentAction };

export interface BillingPaymentCard {
  brand: string;
  last4: string;
}

// What one run of the gateway token reconciliation did. Counts only: no
// token, payment-method id or customer id.
export interface TokenReconciliationSummary {
  customersScanned: number;
  methodsScanned: number;
  orphansDetached: number;
  recentSkipped: number;
  missingCustomers: number;
  failures: number;
}

export interface BillingApi {
  validateCard(
    card: BillingCardInput,
    now: Date,
  ): Promise<BillingCardFieldErrors>;
  // Whether the active gateway takes this kind of source: typed cards only
  // in simulated mode, PaymentMethod ids only in Stripe mode (GW-38)
  acceptsSource(source: ChargeSource): Promise<boolean>;
  charge(input: ChargeDto): Promise<ChargeOutcome>;
  // Captures an authorized payment (3 attempts, then it throws and the payment
  // stays authorized) and saves the card held for it
  capture(paymentId: string): Promise<void>;
  // Releases an authorized or challenged payment without a refund
  cancel(paymentId: string): Promise<void>;
  // Records the result of a payment's 3-D Secure challenge
  settle(paymentId: string): Promise<SettleOutcome>;
  // The challenge a payment still awaits, or null
  findPaymentAction(paymentId: string): Promise<PaymentAction | null>;
  refund(paymentId: string): Promise<void>;
  findPaymentCard(paymentId: string): Promise<BillingPaymentCard | null>;
}

export const BillingApi = Symbol('BillingApi');
