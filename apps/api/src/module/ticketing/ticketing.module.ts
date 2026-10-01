import { Module } from '@nestjs/common';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';

@Module({
  imports: [TicketingPersistenceModule],
})
export class TicketingModule {}
