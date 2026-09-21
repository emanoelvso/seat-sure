import { EventRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { Injectable } from '@nestjs/common';
import { EventType } from '../enum/event-type.enum';
import { EventStatus } from '../enum/event-status.enum';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import {
  Between,
  FindManyOptions,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { ArtistRepository } from '@catalogModule/persistence/repository/artist.repository';

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
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly artistRepository: ArtistRepository,
  ) {}

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
    let options: FindManyOptions<Event> = { take: limit + 1 };

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
      const { min, max } = priceRange;
      const hasMin = min != null;
      const hasMax = max != null;

      if (hasMax && !hasMin) {
        options.where = { ...options.where, price: LessThanOrEqual(max) };
      } else if (hasMin && !hasMax) {
        options.where = { ...options.where, price: MoreThanOrEqual(min) };
      } else if (hasMin && hasMax) {
        options.where = { ...options.where, price: Between(min, max) };
      }
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

    const events = await this.eventRepository.find(options);

    const hasMore = (events?.length || 0) > limit;

    const cities = [...new Set(events?.map((e) => e.city))].sort();

    return {
      cities,
      events: hasMore ? events?.slice(0, limit) : events,
      hasMore,
    };
  }

  async findArtistBySlug({ slug }: { slug: string; city?: string }) {
    const artist = await this.artistRepository.findOne({ where: { slug } });

    if (!artist) {
      return null;
    }

    const [events, nearbyEvents] = await Promise.all([
      this.eventRepository.findEventByArtist({
        artistId: artist.id,
      }),
      this.eventRepository.findByType({ type: EventType.CONCERT }, { take: 4 }),
    ]);

    return {
      artist: {
        name: artist?.stage_name,
        bio: artist?.bio,
        cover: artist?.cover_image_url,
      },
      events,
      nearbyEvents,
    };
  }
}
