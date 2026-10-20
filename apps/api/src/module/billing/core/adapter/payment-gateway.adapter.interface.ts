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

// A Stripe PaymentMethod attached to the user's customer (GW-37)
export type AttachResult =
  | {
      status: 'succeeded';
      token: string;
      customerId: string;
      fingerprint: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      holder: string;
    }
  | { status: 'failed'; reason: 'card_declined' };

// A card method attached to a customer, with when Stripe made it
export interface CustomerPaymentMethod {
  token: string;
  createdAt: Date;
}

// `missing`: the gateway no longer knows the customer
export type CustomerPaymentMethods =
  { status: 'found'; methods: CustomerPaymentMethod[] } | { status: 'missing' };

// Every money-moving call carries an idempotency key, so a retry never moves
// money twice (GW-02)
export interface PaymentGateway {
  readonly provider: GatewayProvider;
  readonly acceptsTypedCards: boolean;
  tokenize(card: CardInput): Promise<TokenizeResult>;
  attachPaymentMethod(
    paymentMethodId: string,
    userId: string,
  ): Promise<AttachResult>;
  // The brand and last 4 of a PaymentMethod, for the payment record
  describePaymentMethod(
    paymentMethodId: string,
  ): Promise<{ brand: string; last4: string }>;
  // Resolves when the method is already detached or no longer exists
  detach(token: string): Promise<void>;
  // Every card method attached to the customer, following pagination
  listCustomerPaymentMethods(
    customerId: string,
  ): Promise<CustomerPaymentMethods>;
  // Deleting it detaches all its methods. Resolves when it is already gone.
  deleteCustomer(customerId: string): Promise<void>;
  authorize(input: AuthorizeInput, key: string): Promise<AuthorizeResult>;
  getPayment(providerPaymentId: string): Promise<GatewayPayment>;
  capture(providerPaymentId: string, key: string): Promise<void>;
  cancel(providerPaymentId: string, key: string): Promise<void>;
  refund(providerPaymentId: string, key: string): Promise<void>;
}

export const PaymentGateway = Symbol('PaymentGateway');
