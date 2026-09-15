import { Module } from '@nestjs/common';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CatalogResolver } from './http/graphql/catalog.resolver';
import { CatalogService } from './core/service/catalog.service';

@Module({
  imports: [
    CatalogPersistenceModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      driver: ApolloDriver,
    }),
  ],
  providers: [CatalogResolver, CatalogService],
})
export class CatalogModule {}
