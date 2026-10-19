import { CardInput } from '@billingModule/core/util/card-rules';

export type GatewayProvider = 'simulated' | 'stripe';

// What an authorization draws from: a typed card, or a token from `tokenize`
export type AuthorizeSource =
  | { type: 'card'; card: CardInput }
  | { type: 'token'; token: string; customerId?: string };

export interface AuthorizeInput {
  amountCents: number;
  currency: string;
  source: AuthorizeSource;
}

export type AuthorizeResult =
  | { status: 'authorized'; providerPaymentId: string }
  | {
      status: 'requires_action';
      providerPaymentId: string;
      clientSecret: string;
    }
  | { status: 'failed'; reason: 'card_declined' };

export type GatewayPayment =
  | { status: 'authorized' }
  | { status: 'requires_action'; clientSecret: string }
  | { status: 'authentication_failed' }
  | { status: 'cancelled' }
  | { status: 'captured' };

export type TokenizeResult =
  | { status: 'succeeded'; token: string; fingerprint: string }
  | { status: 'failed'; reason: 'card_declined' };

// Every money-moving call carries an idempotency key, so a retry never moves
// money twice (GW-02)
export interface PaymentGateway {
  readonly provider: GatewayProvider;
  readonly acceptsTypedCards: boolean;
  tokenize(card: CardInput): Promise<TokenizeResult>;
  detach(token: string): Promise<void>;
  authorize(input: AuthorizeInput, key: string): Promise<AuthorizeResult>;
  getPayment(providerPaymentId: string): Promise<GatewayPayment>;
  capture(providerPaymentId: string, key: string): Promise<void>;
  cancel(providerPaymentId: string, key: string): Promise<void>;
  refund(providerPaymentId: string, key: string): Promise<void>;
}

export const PaymentGateway = Symbol('PaymentGateway');
