import { Module } from '@nestjs/common';
import { BillingModule } from '@billingModule/billing.module';
import { CatalogModule } from '@catalogModule/catalog.module';
import { IdentityModule } from '@identityModule/identity.module';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { AdmissionModule } from '@sharedModules/admission/admission.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { TicketSender } from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';
import { LogTicketSender } from '@ticketingModule/integration/provider/log-ticket-sender.provider';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { AccountOrdersService } from './core/service/account-orders.service';
import { CheckoutService } from './core/service/checkout.service';
import { OrderPaymentService } from './core/service/order-payment.service';
import { TicketCodeGenerator } from './core/service/ticket-code-generator.service';
import { TicketingService } from './core/service/ticketing.service';
import { TicketingResolver } from './http/graphql/ticketing.resolver';

@Module({
  imports: [
    TicketingPersistenceModule,
    CatalogModule,
    BillingModule,
    IdentityModule,
    NotificationsModule,
    AuthModule,
    AdmissionModule,
    LoggerModule,
  ],
  providers: [
    TicketingResolver,
    TicketingService,
    CheckoutService,
    OrderPaymentService,
    AccountOrdersService,
    TicketCodeGenerator,
    { provide: TicketSender, useClass: LogTicketSender },
  ],
})
export class TicketingModule {}
