import { Module } from '@nestjs/common';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { CatalogApi } from '@sharedModules/integration/interface/catalog-integration.interface';
import { CatalogPublicApiProvider } from './integration/provider/public-api.provider';
import { CatalogResolver } from './http/graphql/catalog.resolver';
import { CatalogService } from './core/service/catalog.service';

@Module({
  imports: [CatalogPersistenceModule],
  providers: [
    CatalogResolver,
    CatalogService,
    { provide: CatalogApi, useClass: CatalogPublicApiProvider },
  ],
  exports: [CatalogApi],
})
export class CatalogModule {}
