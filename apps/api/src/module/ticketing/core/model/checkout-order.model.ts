// What the buyer sees of an order. `processing` is reported as PENDING, and a
// pending or processing order past its expiry as EXPIRED.
export enum CheckoutOrderStatus {
  PENDING = 'PENDING',
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
  // API clock, 0 unless pending
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
}
