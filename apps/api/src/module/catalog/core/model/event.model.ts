import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';

export interface EventModel {
  id: string;
  name: string;
  description?: string | null;
  type: EventType;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  date: Date;
  startAt: Date;
  endsAt: Date;
  doorsOpen: Date;
  status: EventStatus;
  category: string;
  price: number;
  tags?: string[] | null;
}
