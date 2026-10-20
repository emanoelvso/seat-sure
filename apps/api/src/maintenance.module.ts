import { BillingModule } from '@billingModule/billing.module';
import { IdentityModule } from '@identityModule/identity.module';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { MaintenanceRunner } from '@sharedModules/maintenance/maintenance-runner.service';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';

// The modules the scheduled command needs: every module that holds user data
// (so Identity discovers their erasers) and Billing for the gateway. No
// GraphqlModule: the command serves no requests.
@Module({
  imports: [
    LoggerModule,
    IdentityModule,
    UserProfileModule,
    NotificationsModule,
    TicketingModule,
    BillingModule,
  ],
  providers: [MaintenanceRunner],
})
export class MaintenanceModule {}
