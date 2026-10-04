export interface TicketTypeModel {
  id: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  serviceFeeCents: number;
  taxCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string[];
}
