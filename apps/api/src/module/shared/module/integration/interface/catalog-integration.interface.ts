export interface CheckoutSelectionEvent {
  id: string;
  name: string;
  startAt: Date;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
}

export interface CheckoutSelectionTicketType {
  id: string;
  name: string;
  priceCents: number;
  serviceFeeCents: number;
  taxCents: number;
  currency: string;
  maxPerOrder: number;
}

export interface CheckoutSelectionSeat {
  id: string;
  row: string;
  number: string;
}

export interface CheckoutSelection {
  event: CheckoutSelectionEvent;
  ticketType: CheckoutSelectionTicketType;
  seats: CheckoutSelectionSeat[];
}

export interface FindCheckoutSelectionInput {
  eventId: string;
  ticketTypeId: string;
  seatIds: string[];
  now?: Date;
}

export interface CatalogApi {
  findCheckoutSelection(
    input: FindCheckoutSelectionInput,
  ): Promise<CheckoutSelection | null>;
}

export const CatalogApi = Symbol('CatalogApi');
