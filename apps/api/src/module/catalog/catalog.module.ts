import { Module } from '@nestjs/common';
import { join } from 'path';
import { CatalogPersistenceModule } from '@catalogModule/persistence/catalog-persistence.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CatalogResolver } from './http/graphql/catalog.resolver';
import { CatalogService } from './core/service/catalog.service';

@Module({
  imports: [
    CatalogPersistenceModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      // Written on boot and committed: apps/web codegen reads it.
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      driver: ApolloDriver,
    }),
  ],
  providers: [CatalogResolver, CatalogService],
})
export class CatalogModule {}
