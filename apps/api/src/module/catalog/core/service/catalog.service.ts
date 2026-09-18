import { CatalogRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { Injectable } from '@nestjs/common';
import { EventType } from '../enum/event-type.enum';
import { EventStatus } from '../enum/event-status.enum';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { Between, FindManyOptions, LessThanOrEqual } from 'typeorm';

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

interface PriceRange {
  min: number;
  max?: number | null;
}

interface DateRange {
  from: Date;
  to?: Date | null;
}

interface FindEventsProps {
  type?: EventType | undefined;
  city?: string | undefined;
  priceRange?: PriceRange | undefined;
  dateRange?: DateRange | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async createEvent(event: CreateEventDto): Promise<Event> {
    const newEvent = new Event(event);
    await this.catalogRepository.save(newEvent);
    return newEvent;
  }

  async getHomeSections() {
    const [concerts, shows, sports, festivals] = await Promise.all([
      this.catalogRepository.findByType(
        { type: EventType.CONCERT },
        { take: 8 },
      ),
      this.catalogRepository.findByType({ type: EventType.SHOW }, { take: 8 }),
      this.catalogRepository.findByType({ type: EventType.SPORT }, { take: 8 }),
      this.catalogRepository.findByType(
        { type: EventType.FESTIVAL },
        { take: 8 },
      ),
    ]);

    return {
      shows: {
        categories: [
          ...new Set(
            shows
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: shows,
      },
      concerts: {
        categories: [
          ...new Set(
            concerts
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: concerts,
      },
      sports: {
        categories: [
          ...new Set(
            sports
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: sports,
      },
      festivals: {
        categories: [
          ...new Set(
            festivals
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: festivals,
      },
    };
  }

  async findEvents({
    type,
    city,
    priceRange,
    dateRange,
    limit = 20,
    offset,
  }: FindEventsProps) {
    let options: FindManyOptions<Event> = { take: limit };

    if (offset) {
      options.skip = offset;
    }

    if (type) {
      options.where = { ...options.where, type };
    }

    if (city) {
      options.where = { ...options.where, city };
    }

    if (priceRange) {
      options.where = {
        ...options.where,
        price: priceRange.max
          ? Between(priceRange.min, priceRange.max)
          : LessThanOrEqual(priceRange.min),
      };
    }

    if (dateRange) {
      const from = new Date(dateRange.from);
      const to = dateRange.to
        ? new Date(dateRange.to)
        : new Date(from.getTime() + 86_400_000 - 1);

      options.where = {
        ...options.where,
        date: Between(from, to),
      };
    }

    console.info(options);

    const events = await this.catalogRepository.find(options);
    const cities = [...new Set(events?.map((e) => e.city))].sort();

    return {
      cities,
      events,
    };
  }
}
