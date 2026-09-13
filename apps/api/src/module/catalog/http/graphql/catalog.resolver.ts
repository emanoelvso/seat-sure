import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CatalogService } from '@catalogModule/core/service/catalog.service';
import { HomeSections } from '@catalogModule/http/graphql/type/home-sections.type';
import { Event } from '@catalogModule/http/graphql/type/events.type';
import { EventInput } from '@catalogModule/http/graphql/type/event-input.type';

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
}
