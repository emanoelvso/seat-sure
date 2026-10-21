import { Module } from '@nestjs/common';
import { NotificationsPersistenceModule } from '@notificationsModule/persistence/notifications-persistence.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { NotificationsApi } from '@sharedModules/integration/interface/notifications-integration.interface';
import { NotificationsResolver } from './http/graphql/notifications.resolver';
import { NotificationService } from './core/service/notification.service';
import { NotificationsAccountEraser } from './integration/provider/account-eraser.provider';
import { NotificationsPublicApiProvider } from './integration/provider/public-api.provider';

@Module({
  imports: [NotificationsPersistenceModule, AuthModule],
  providers: [
    NotificationsResolver,
    NotificationService,
    NotificationsAccountEraser,
    { provide: NotificationsApi, useClass: NotificationsPublicApiProvider },
  ],
  exports: [NotificationsApi],
})
export class NotificationsModule {}
