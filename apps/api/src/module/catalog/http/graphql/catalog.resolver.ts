import { Query, Resolver } from '@nestjs/graphql';
import { CatalogService } from '@catalogModule/core/service/catalog.service';
import { HomeSections } from './type/events.type';

@Resolver()
export class CatalogResolver {
  constructor(private readonly catalogService: CatalogService) {}

  @Query(() => HomeSections)
  async getHomeSections(): Promise<HomeSections> {
    return this.catalogService.getHomeSections();
  }
}
