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
import { TicketTypeRepository } from '@catalogModule/persistence/repository/ticket-type.repository';
import { SeatMap as SeatMapEntity } from '@catalogModule/persistence/entity/seat-map.entity';
import { TicketType as TicketTypeEntity } from '@catalogModule/persistence/entity/ticket-type.entity';
import { SeatMapModel } from '@catalogModule/core/model/seat-map.model';
import { TicketTypeModel } from '@catalogModule/core/model/ticket-type.model';
import { EventModel } from '@catalogModule/core/model/event.model';
import { isUUID } from 'class-validator';

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
    private readonly ticketTypeRepository: TicketTypeRepository,
  ) {}

  async createEvent(event: CreateEventDto): Promise<EventModel> {
    const newEvent = new Event(event);
    await this.eventRepository.save(newEvent);
    return this.toEventModel(newEvent);
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
        events: shows?.map((event) => this.toEventModel(event)),
      },
      concerts: {
        categories: [
          ...new Set(
            concerts
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: concerts?.map((event) => this.toEventModel(event)),
      },
      sports: {
        categories: [
          ...new Set(
            sports
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: sports?.map((event) => this.toEventModel(event)),
      },
      festivals: {
        categories: [
          ...new Set(
            festivals
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: festivals?.map((event) => this.toEventModel(event)),
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
    const options: FindManyOptions<Event> = { take: limit + 1 };

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

    const events = await this.eventRepository.find(options);

    const hasMore = (events?.length || 0) > limit;

    const cities = [...new Set(events?.map((e) => e.city))].sort();

    const page = hasMore ? events?.slice(0, limit) : events;

    return {
      cities,
      events: page?.map((event) => this.toEventModel(event)),
      hasMore,
    };
  }

  async findArtistBySlug({
    slug,
    now = new Date(),
  }: {
    slug: string;
    now?: Date;
  }) {
    const artist = await this.artistRepository.findOne({ where: { slug } });

    if (!artist) {
      return {
        artist: null,
        eventsByCity: [],
        nearbyEvents: [],
        featuredFestival: null,
      };
    }

    const [events, nearbyEvents, featuredFestival] = await Promise.all([
      this.eventRepository.findUpcomingByArtist({
        artistId: artist.id,
        now,
      }),
      this.eventRepository.findSimilarConcerts({
        artistId: artist.id,
        genres: artist.genres
          .map((genre) => genre.trim().toLowerCase())
          .filter(Boolean),
        now,
      }),
      this.eventRepository.findNextFestival({ now }),
    ]);

    const eventsByCity = Array.from(
      events
        .reduce((groups, event) => {
          const key = `${event.city}|${event.country}`;
          const group = groups.get(key) ?? {
            city: event.city,
            country: event.country,
            events: [],
          };

          group.events.push(this.toEventModel(event));
          groups.set(key, group);
          return groups;
        }, new Map<string, { city: string; country: string; events: EventModel[] }>())
        .values(),
    );

    return {
      artist: {
        name: artist?.stage_name,
        bio: artist?.bio,
        cover: artist?.cover_image_url,
      },
      eventsByCity,
      nearbyEvents: nearbyEvents.map((event) => this.toEventModel(event)),
      featuredFestival: featuredFestival
        ? this.toEventModel(featuredFestival)
        : null,
    };
  }

  async findEventTickets({
    eventId,
    now = new Date(),
  }: {
    eventId: string;
    now?: Date;
  }) {
    if (!isUUID(eventId)) {
      return { event: null, seatMap: null, ticketTypes: [] };
    }

    const event = await this.eventRepository.findUpcomingPublishedById({
      id: eventId,
      now,
    });

    if (!event) {
      return { event: null, seatMap: null, ticketTypes: [] };
    }

    const ticketTypes = await this.ticketTypeRepository.findByEvent(event.id);

    return {
      event: this.toEventModel(event),
      seatMap: event.seatMap ? this.mapSeatMap(event.seatMap) : null,
      ticketTypes: ticketTypes.map((ticketType) =>
        this.mapTicketType(ticketType),
      ),
    };
  }

  private toEventModel(event: Event): EventModel {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      type: event.type,
      coverImage: event.coverImage,
      venue: event.venue,
      city: event.city,
      country: event.country,
      date: event.date,
      startAt: event.startAt,
      endsAt: event.endsAt,
      doorsOpen: event.doorsOpen,
      status: event.status,
      category: event.category,
      price: event.price,
      tags: event.tags,
    };
  }

  private mapSeatMap(seatMap: SeatMapEntity): SeatMapModel {
    const { layout } = seatMap;

    return {
      id: seatMap.id,
      name: seatMap.name,
      viewBoxWidth: layout.viewBox.width,
      viewBoxHeight: layout.viewBox.height,
      labelSize: layout.labelStyle.size,
      labelWeight: layout.labelStyle.weight,
      stage: {
        label: layout.stage.label,
        labelX: layout.stage.labelAt?.[0] ?? null,
        labelY: layout.stage.labelAt?.[1] ?? null,
        shapes: layout.stage.shapes.map((shape) => ({
          path: shape.path,
          color: shape.color,
        })),
      },
      sections: layout.sections.map((section) => ({
        key: section.key,
        label: section.label,
        color: section.color,
        shapes: section.shapes.map((shape) => ({
          path: shape.path,
          labelX: shape.labelAt[0],
          labelY: shape.labelAt[1],
          labelRotation: shape.labelRotation,
        })),
      })),
    };
  }

  private mapTicketType(ticketType: TicketTypeEntity): TicketTypeModel {
    return {
      id: ticketType.id,
      sectionKey: ticketType.sectionKey,
      name: ticketType.name,
      priceCents: ticketType.priceCents,
      currency: ticketType.currency,
      seatsAvailable: ticketType.seatsAvailable,
      maxPerOrder: ticketType.maxPerOrder,
      tags: ticketType.tags ?? [],
    };
  }
}
