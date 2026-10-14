export interface TicketTypeModel {
  id: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  // The base price plus the highest row premium; the base price without one
  maxPriceCents: number;
  serviceFeeCents: number;
  taxCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string[];
}
