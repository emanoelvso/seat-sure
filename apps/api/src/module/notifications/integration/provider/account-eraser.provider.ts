import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@notificationsModule/persistence/repository/notification.repository';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';

// Found by Identity through DiscoveryService when it deletes an account
@AccountErasure()
@Injectable()
export class NotificationsAccountEraser implements AccountEraser {
  readonly name = 'notifications';

  constructor(private readonly notifications: NotificationRepository) {}

  async erase(userId: string): Promise<void> {
    await this.notifications.deleteAllForUser(userId);
  }
}
