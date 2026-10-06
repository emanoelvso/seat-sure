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

export interface ChargeDto {
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  card: BillingCardInput;
}

export interface ChargeOutcome {
  paymentId: string;
  status: 'succeeded' | 'failed';
}

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
