import { Module } from '@nestjs/common';
import { CatalogModule } from '@catalogModule/catalog.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { CheckoutService } from './core/service/checkout.service';
import { TicketingService } from './core/service/ticketing.service';
import { TicketingResolver } from './http/graphql/ticketing.resolver';

@Module({
  imports: [TicketingPersistenceModule, CatalogModule, AuthModule],
  providers: [TicketingResolver, TicketingService, CheckoutService],
})
export class TicketingModule {}
