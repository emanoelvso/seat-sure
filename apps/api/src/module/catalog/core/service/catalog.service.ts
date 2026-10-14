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
import { TicketTypeRowPriceRepository } from '@catalogModule/persistence/repository/ticket-type-row-price.repository';
import { SeatMapSectionViewRepository } from '@catalogModule/persistence/repository/seat-map-section-view.repository';
import { SeatRepository } from '@catalogModule/persistence/repository/seat.repository';
import { SeatMap as SeatMapEntity } from '@catalogModule/persistence/entity/seat-map.entity';
import { TicketType as TicketTypeEntity } from '@catalogModule/persistence/entity/ticket-type.entity';
import { Seat as SeatEntity } from '@catalogModule/persistence/entity/seat.entity';
import { SeatMapModel } from '@catalogModule/core/model/seat-map.model';
import { TicketTypeModel } from '@catalogModule/core/model/ticket-type.model';
import {
  SeatModel,
  TicketTypeSeatsModel,
} from '@catalogModule/core/model/seat.model';
import {
  EventHeadlinerModel,
  EventModel,
} from '@catalogModule/core/model/event.model';
import { VenueRepository } from '@catalogModule/persistence/repository/venue.repository';
import { EventArtistRepository } from '@catalogModule/persistence/repository/event-artist.repository';
import { VenueNotFoundException } from '@catalogModule/core/exception/venue-not-found.exception';
import { SeatMapNotFoundException } from '@catalogModule/core/exception/seat-map-not-found.exception';
import { CatalogException } from '@catalogModule/core/exception/catalog.exception';
import { SeatMapRepository } from '@catalogModule/persistence/repository/seat-map.repository';
import { isUUID } from 'class-validator';
import { Transactional } from 'typeorm-transactional';

export interface CreateEventDto {
  type: EventType;
  name: string;
  description?: string;
  coverImage: string;
  venueId: string;
  seatMapId?: string;
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
    private readonly venueRepository: VenueRepository,
    private readonly eventArtistRepository: EventArtistRepository,
    private readonly seatRepository: SeatRepository,
    private readonly seatMapRepository: SeatMapRepository,
    private readonly ticketTypeRowPriceRepository: TicketTypeRowPriceRepository,
    private readonly seatMapSectionViewRepository: SeatMapSectionViewRepository,
  ) {}

  @Transactional({ connectionName: 'catalog' })
  async createEvent({
    venueId,
    seatMapId,
    ...event
  }: CreateEventDto): Promise<EventModel> {
    const venue = await this.venueRepository.findOneById(venueId);

    if (!venue) {
      throw new VenueNotFoundException();
    }

    const seatMap = seatMapId
      ? await this.findVenueSeatMap(seatMapId, venueId)
      : undefined;

    const newEvent = new Event({ ...event, venue, seatMap });
    await this.eventRepository.save(newEvent);
    const [eventModel] = await this.toEventModels([newEvent]);
    return eventModel;
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

    // One headliner lookup for the four sections.
    const eventModels = await this.toEventModels(
      [concerts, shows, sports, festivals].flatMap((events) => events ?? []),
    );
    const eventModelById = new Map(
      eventModels.map((eventModel) => [eventModel.id, eventModel]),
    );
    const toSectionEvents = (events: Event[] | null) =>
      events?.map((event) => eventModelById.get(event.id)!);

    return {
      shows: {
        categories: [
          ...new Set(
            shows
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: toSectionEvents(shows),
      },
      concerts: {
        categories: [
          ...new Set(
            concerts
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: toSectionEvents(concerts),
      },
      sports: {
        categories: [
          ...new Set(
            sports
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: toSectionEvents(sports),
      },
      festivals: {
        categories: [
          ...new Set(
            festivals
              ?.filter((event) => event.status === EventStatus.PUBLISHED)
              .map((event) => event.category),
          ),
        ],
        events: toSectionEvents(festivals),
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
    const options: FindManyOptions<Event> = {
      relations: { venue: true },
      take: limit + 1,
    };

    if (offset) {
      options.skip = offset;
    }

    if (type) {
      options.where = { ...options.where, type };
    }

    if (city) {
      options.where = { ...options.where, venue: { city } };
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

    const cities = [...new Set(events?.map((e) => e.venue.city))].sort();

    const page = hasMore ? events?.slice(0, limit) : events;

    return {
      cities,
      events: page && (await this.toEventModels(page)),
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

    // One headliner lookup for the artist's events, nearby events and the
    // featured festival.
    const eventModels = await this.toEventModels([
      ...events,
      ...nearbyEvents,
      ...(featuredFestival ? [featuredFestival] : []),
    ]);
    const eventModelById = new Map(
      eventModels.map((eventModel) => [eventModel.id, eventModel]),
    );

    const eventsByCity = Array.from(
      events
        .reduce((groups, event) => {
          const { city, country } = event.venue;
          const key = `${city}|${country}`;
          const group = groups.get(key) ?? { city, country, events: [] };

          group.events.push(eventModelById.get(event.id)!);
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
      nearbyEvents: nearbyEvents.map((event) => eventModelById.get(event.id)!),
      featuredFestival: featuredFestival
        ? eventModelById.get(featuredFestival.id)!
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
    const [eventModel] = await this.toEventModels([event]);

    return {
      event: eventModel,
      seatMap: event.seatMap ? this.mapSeatMap(event.seatMap) : null,
      ticketTypes: ticketTypes.map((ticketType) =>
        this.mapTicketType(ticketType),
      ),
    };
  }

  async findTicketTypeSeats({
    eventId,
    ticketTypeId,
    now = new Date(),
  }: {
    eventId: string;
    ticketTypeId: string;
    now?: Date;
  }): Promise<TicketTypeSeatsModel> {
    const empty: TicketTypeSeatsModel = {
      event: null,
      ticketType: null,
      seatMap: null,
      seats: [],
      sectionView: null,
    };

    if (!isUUID(eventId) || !isUUID(ticketTypeId)) {
      return empty;
    }

    const [event, ticketType] = await Promise.all([
      this.eventRepository.findUpcomingPublishedById({ id: eventId, now }),
      this.ticketTypeRepository.findOneOfEvent(ticketTypeId, eventId),
    ]);

    if (!event || !ticketType) {
      return empty;
    }

    const [[eventModel], seats, rowPrices, sectionView] = await Promise.all([
      this.toEventModels([event]),
      event.seatMap
        ? this.seatRepository.findBySection(
            event.seatMap.id,
            ticketType.sectionKey,
          )
        : [],
      this.ticketTypeRowPriceRepository.findByTicketType(ticketType.id),
      event.seatMap
        ? this.seatMapSectionViewRepository.findBySection(
            event.seatMap.id,
            ticketType.sectionKey,
          )
        : null,
    ]);
    const premiumByRow = new Map(
      rowPrices.map(({ row, premiumCents }) => [row, premiumCents]),
    );

    return {
      event: eventModel,
      ticketType: this.mapTicketType(ticketType),
      seatMap: event.seatMap ? this.mapSeatMap(event.seatMap) : null,
      seats: seats.map((seat) =>
        this.mapSeat(
          seat,
          ticketType.priceCents + (premiumByRow.get(seat.row) ?? 0),
        ),
      ),
      sectionView: sectionView
        ? { score: sectionView.score, label: sectionView.label }
        : null,
    };
  }

  // The database also rejects a map of another venue; checking first returns
  // a reason instead of a foreign-key error.
  private async findVenueSeatMap(seatMapId: string, venueId: string) {
    const seatMap = await this.seatMapRepository.findOneById(seatMapId);

    if (!seatMap) {
      throw new SeatMapNotFoundException();
    }

    if (seatMap.venueId !== venueId) {
      throw new CatalogException(
        'SEAT_MAP_VENUE_MISMATCH',
        'The seat map belongs to another venue',
      );
    }

    return seatMap;
  }

  // Maps events with their headliner, read in one query. The rows come ordered
  // by pick, so the first row of each event is its headliner.
  private async toEventModels(events: Event[]): Promise<EventModel[]> {
    const headliners =
      await this.eventArtistRepository.findHeadlinersByEventIds(
        events.map((event) => event.id),
      );
    const headlinerByEventId = new Map<string, EventHeadlinerModel>();

    for (const { event, artist } of headliners) {
      if (!headlinerByEventId.has(event.id)) {
        headlinerByEventId.set(event.id, {
          slug: artist.slug,
          name: artist.stage_name,
        });
      }
    }

    return events.map((event) =>
      this.toEventModel(event, headlinerByEventId.get(event.id) ?? null),
    );
  }

  private toEventModel(
    event: Event,
    headliner: EventHeadlinerModel | null,
  ): EventModel {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      type: event.type,
      coverImage: event.coverImage,
      venue: event.venue.name,
      city: event.venue.city,
      country: event.venue.country,
      date: event.date,
      startAt: event.startAt,
      endsAt: event.endsAt,
      doorsOpen: event.doorsOpen,
      status: event.status,
      category: event.category,
      price: event.price,
      tags: event.tags,
      headliner,
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
      serviceFeeCents: ticketType.serviceFeeCents,
      taxCents: ticketType.taxCents,
      currency: ticketType.currency,
      seatsAvailable: ticketType.seatsAvailable,
      maxPerOrder: ticketType.maxPerOrder,
      tags: ticketType.tags ?? [],
    };
  }

  private mapSeat(seat: SeatEntity, priceCents: number): SeatModel {
    return {
      id: seat.id,
      row: seat.row,
      number: seat.number,
      x: seat.x,
      y: seat.y,
      priceCents,
      perks: seat.perks,
    };
  }
}
