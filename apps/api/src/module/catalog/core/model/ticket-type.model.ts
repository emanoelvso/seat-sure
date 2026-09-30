export interface TicketTypeModel {
  id: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string[];
}
