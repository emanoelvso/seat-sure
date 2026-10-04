import { Module } from '@nestjs/common';
import { CatalogModule } from '@catalogModule/catalog.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { TicketSender } from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';
import { LogTicketSender } from '@ticketingModule/integration/provider/log-ticket-sender.provider';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { CheckoutService } from './core/service/checkout.service';
import { TicketCodeGenerator } from './core/service/ticket-code-generator.service';
import { TicketingService } from './core/service/ticketing.service';
import { TicketingResolver } from './http/graphql/ticketing.resolver';

@Module({
  imports: [
    TicketingPersistenceModule,
    CatalogModule,
    AuthModule,
    LoggerModule,
  ],
  providers: [
    TicketingResolver,
    TicketingService,
    CheckoutService,
    TicketCodeGenerator,
    { provide: TicketSender, useClass: LogTicketSender },
  ],
})
export class TicketingModule {}
