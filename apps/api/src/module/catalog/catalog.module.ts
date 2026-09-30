import { Module } from '@nestjs/common';
import { join } from 'path';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { CatalogResolver } from './http/graphql/catalog.resolver';
import { CatalogService } from './core/service/catalog.service';

@Module({
  imports: [CatalogPersistenceModule],
  providers: [CatalogResolver, CatalogService],
})
export class CatalogModule {}
