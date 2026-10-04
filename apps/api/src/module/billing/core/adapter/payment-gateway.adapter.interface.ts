import { CardInput } from '@billingModule/core/util/card-rules';

export interface ChargeInput {
  amountCents: number;
  currency: string;
  card: CardInput;
}

export type ChargeResult =
  | { status: 'succeeded'; providerPaymentId: string }
  | { status: 'failed'; reason: 'card_declined' };

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(providerPaymentId: string): Promise<void>;
}

export const PaymentGateway = Symbol('PaymentGateway');
