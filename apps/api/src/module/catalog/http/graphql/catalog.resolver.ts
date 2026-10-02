import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CatalogService } from '@catalogModule/core/service/catalog.service';
import { HomeSections } from '@catalogModule/http/graphql/type/home-sections.type';
import { Event } from '@catalogModule/http/graphql/type/events.type';
import { EventInput } from '@catalogModule/http/graphql/type/event-input.type';
import { FindEvents } from './type/find-events.type';
import { FindEventsInput } from './type/find-events-input.type';
import { FindArtist } from './type/find-artist.type';
import { FindArtistInput } from './type/find-artist-input.type';
import { EventTickets } from './type/event-tickets.type';
import { FindEventTicketsInput } from './type/find-event-tickets-input.type';
import { TicketTypeSeats } from './type/ticket-type-seats.type';
import { FindTicketTypeSeatsInput } from './type/find-ticket-type-seats-input.type';

@Resolver()
export class CatalogResolver {
  constructor(private readonly catalogService: CatalogService) {}

  @Mutation(() => Event)
  async createEvent(@Args('EventInput') eventInput: EventInput) {
    const event = await this.catalogService.createEvent({
      ...eventInput,
      date: new Date(eventInput.date),
      startAt: new Date(eventInput.startAt),
      endsAt: new Date(eventInput.endsAt),
      doorsOpen: new Date(eventInput.doorsOpen),
    });
    return event;
  }

  @Query(() => HomeSections)
  async getHomeSections(): Promise<HomeSections> {
    return this.catalogService.getHomeSections();
  }

  @Query(() => FindEvents)
  async findEvents(
    @Args('FindEventsInput', { nullable: true })
    findEventsInput?: FindEventsInput,
  ): Promise<FindEvents> {
    return this.catalogService.findEvents({
      type: findEventsInput?.type,
      city: findEventsInput?.city,
      priceRange: findEventsInput?.priceRange,
      dateRange: findEventsInput?.dateRange,
      limit: findEventsInput?.limit,
      offset: findEventsInput?.offset,
    });
  }

  @Query(() => FindArtist)
  async findArtistBySlug(@Args('FindArtistInput') { slug }: FindArtistInput) {
    return this.catalogService.findArtistBySlug({ slug });
  }

  @Query(() => EventTickets)
  async findEventTickets(
    @Args('FindEventTicketsInput') { eventId }: FindEventTicketsInput,
  ): Promise<EventTickets> {
    return this.catalogService.findEventTickets({ eventId });
  }

  @Query(() => TicketTypeSeats)
  async findTicketTypeSeats(
    @Args('FindTicketTypeSeatsInput')
    { eventId, ticketTypeId }: FindTicketTypeSeatsInput,
  ): Promise<TicketTypeSeats> {
    return this.catalogService.findTicketTypeSeats({ eventId, ticketTypeId });
  }
}
