import { Module } from '@nestjs/common';
import { NotificationsPersistenceModule } from '@notificationsModule/persistence/notifications-persistence.module';
import { NotificationsApi } from '@sharedModules/integration/interface/notifications-integration.interface';
import { NotificationService } from './core/service/notification.service';
import { NotificationsPublicApiProvider } from './integration/provider/public-api.provider';

@Module({
  imports: [NotificationsPersistenceModule],
  providers: [
    NotificationService,
    { provide: NotificationsApi, useClass: NotificationsPublicApiProvider },
  ],
  exports: [NotificationsApi],
})
export class NotificationsModule {}
