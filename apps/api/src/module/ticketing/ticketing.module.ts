import { Module } from '@nestjs/common';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { TicketingService } from './core/service/ticketing.service';
import { TicketingResolver } from './http/graphql/ticketing.resolver';

@Module({
  imports: [TicketingPersistenceModule],
  providers: [TicketingResolver, TicketingService],
})
export class TicketingModule {}
