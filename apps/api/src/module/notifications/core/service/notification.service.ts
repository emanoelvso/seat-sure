import { Injectable } from '@nestjs/common';
import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import {
  NotificationPayload,
  NotificationsNotification,
} from '@notificationsModule/persistence/entity/notifications-notification.entity';
import { NotificationRepository } from '@notificationsModule/persistence/repository/notification.repository';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  sourceId: string;
  payload: NotificationPayload;
  now: Date;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  // A repeated (userId, type, sourceId) stores nothing
  async create(input: CreateNotificationInput): Promise<void> {
    await this.notificationRepository.insertIgnoringDuplicate(
      new NotificationsNotification({
        userId: input.userId,
        type: input.type,
        channel: 'in_app',
        sourceId: input.sourceId,
        payload: input.payload,
        readAt: null,
        createdAt: input.now,
      }),
    );
  }
}
