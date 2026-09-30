import { CatalogModule } from '@catalogModule/catalog.module';
import { Module } from '@nestjs/common';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';

@Module({
  imports: [GraphqlModule, CatalogModule],
})
export class AppModule {}
