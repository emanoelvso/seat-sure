import { CardInput } from '@billingModule/core/util/card-rules';

// What a charge draws from: a typed card, or a token from `tokenize`
export type ChargeSource =
  { type: 'card'; card: CardInput } | { type: 'token'; token: string };

export interface ChargeInput {
  amountCents: number;
  currency: string;
  source: ChargeSource;
}

export type ChargeResult =
  | { status: 'succeeded'; providerPaymentId: string }
  | { status: 'failed'; reason: 'card_declined' };

export type TokenizeResult =
  | { status: 'succeeded'; token: string; fingerprint: string }
  | { status: 'failed'; reason: 'card_declined' };

export interface PaymentGateway {
  tokenize(card: CardInput): Promise<TokenizeResult>;
  detach(token: string): Promise<void>;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(providerPaymentId: string): Promise<void>;
}

export const PaymentGateway = Symbol('PaymentGateway');
