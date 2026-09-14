import { CatalogRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { Injectable } from '@nestjs/common';
import { EventType } from '../enum/event-type.enum';
import { EventStatus } from '../enum/event-status.enum';
import { Event } from '@catalogModule/persistence/entity/event.entity';

export interface CreateEventDto {
  type: EventType;
  name: string;
  description?: string;
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
}

@Injectable()
export class CatalogService {
  constructor(private readonly eventRepository: CatalogRepository) {}

  async createEvent(event: CreateEventDto): Promise<Event> {
    const newEvent = new Event(event);
    await this.eventRepository.save(newEvent);
    return newEvent;
  }

  async getHomeSections() {
    const [concerts, shows, sports, festivals] = await Promise.all([
      this.eventRepository.findByType({ type: EventType.CONCERT }, { take: 8 }),
      this.eventRepository.findByType({ type: EventType.SHOW }, { take: 8 }),
      this.eventRepository.findByType({ type: EventType.SPORT }, { take: 8 }),
      this.eventRepository.findByType(
        { type: EventType.FESTIVAL },
        { take: 8 },
      ),
    ]);

    return {
      shows,
      concerts,
      sports,
      festivals,
    };
  }
}
