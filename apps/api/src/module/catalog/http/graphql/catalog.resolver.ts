import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CatalogService } from '@catalogModule/core/service/catalog.service';
import { HomeSections } from '@catalogModule/http/graphql/type/home-sections.type';
import { Event } from '@catalogModule/http/graphql/type/events.type';
import { EventInput } from '@catalogModule/http/graphql/type/event-input.type';
import { FindEvents } from './type/find-events.type';
import { FindEventsInput } from './type/find-events-input.type';
import { FindArtist } from './type/find-artist.type';
import { FindArtistInput } from './type/find-artist-input.type';

@Resolver()
export class CatalogResolver {
  constructor(private readonly catalogService: CatalogService) {}

  @Mutation(() => Event)
  async createEvent(@Args('EventInput') eventInput: EventInput) {
    const event = await this.catalogService.createEvent(eventInput);
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
  async findArtist(@Args('FindArtistInput') { slug }: FindArtistInput) {
    return this.catalogService.findArtistBySlug({ slug });
  }
}
