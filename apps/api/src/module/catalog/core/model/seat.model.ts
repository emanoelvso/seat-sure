import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { EventModel } from '@catalogModule/core/model/event.model';
import { SeatMapModel } from '@catalogModule/core/model/seat-map.model';
import { TicketTypeModel } from '@catalogModule/core/model/ticket-type.model';

export interface SeatModel {
  id: string;
  row: string;
  number: string;
  x: number;
  y: number;
  priceCents: number;
  perks: SeatPerk[];
}

export interface SectionViewModel {
  score: number;
  label: string;
}

export interface TicketTypeSeatsModel {
  event: EventModel | null;
  ticketType: TicketTypeModel | null;
  seatMap: SeatMapModel | null;
  seats: SeatModel[];
  sectionView: SectionViewModel | null;
}
