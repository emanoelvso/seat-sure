import { CatalogModule } from '@catalogModule/catalog.module';
import { Module } from '@nestjs/common';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { TicketingModule } from '@ticketingModule/ticketing.module';

@Module({
  imports: [GraphqlModule, CatalogModule, TicketingModule],
})
export class AppModule {}
