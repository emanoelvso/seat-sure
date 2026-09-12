import { CatalogRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { Injectable } from '@nestjs/common';
import { EventType } from '../enum/event-type.enum';

@Injectable()
export class CatalogService {
  constructor(private readonly eventRepository: CatalogRepository) {}
  async getHomeSections() {
    const [shows, concerts, sports, festivals] = await Promise.all([
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
