import { PaymentAction } from '@sharedModules/integration/interface/billing-integration.interface';

// What the buyer sees of an order. `processing` is reported as PENDING, and an
// open order past its expiry as EXPIRED. REQUIRES_ACTION is a payment waiting
// on the buyer's 3-D Secure challenge.
export enum CheckoutOrderStatus {
  PENDING = 'PENDING',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface CheckoutEventModel {
  id: string;
  name: string;
  startAt: Date;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
}

export interface CheckoutTicketTypeModel {
  id: string;
  name: string;
}

export interface CheckoutOrderItemModel {
  seatId: string;
  row: string;
  number: string;
}

export interface CheckoutOrderModel {
  id: string;
  status: CheckoutOrderStatus;
  expiresAt: Date;
  // API clock, 0 unless pending or awaiting a challenge
  secondsLeft: number;
  quantity: number;
  currency: string;
  subtotalCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  unitPriceCents: number;
  unitServiceFeeCents: number;
  unitTaxCents: number;
  event: CheckoutEventModel;
  ticketType: CheckoutTicketTypeModel;
  items: CheckoutOrderItemModel[];
  // The 3-D Secure challenge a REQUIRES_ACTION order awaits. Never stored by
  // Ticketing: Billing reads it from the gateway on demand (GW-32).
  paymentAction?: PaymentAction | null;
}
