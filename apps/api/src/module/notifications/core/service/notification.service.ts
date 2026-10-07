import { Injectable } from '@nestjs/common';
import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import { NotificationsException } from '@notificationsModule/core/exception/notifications.exception';
import {
  NotificationsPageModel,
  NotificationsTab,
} from '@notificationsModule/core/model/notification.model';
import {
  NotificationPayload,
  NotificationsNotification,
} from '@notificationsModule/persistence/entity/notifications-notification.entity';
import {
  NotificationRepository,
  NotificationTabFilter,
} from '@notificationsModule/persistence/repository/notification.repository';

// The page size is the web's choice; the cap bounds the query
const MAX_PAGE_SIZE = 50;

const TAB_FILTERS: Record<NotificationsTab, NotificationTabFilter> = {
  [NotificationsTab.ALL]: 'all',
  [NotificationsTab.UNREAD]: 'unread',
  [NotificationsTab.READ]: 'read',
};

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

  // One page of the user's notifications in a tab plus the count of every
  // tab. A page past the end serves page 1.
  async list(
    userId: string,
    {
      tab,
      page,
      pageSize,
    }: { tab: NotificationsTab; page: number; pageSize: number },
  ): Promise<NotificationsPageModel> {
    if (page < 1 || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new NotificationsException(
        'INVALID_PAGE',
        `page must be at least 1 and pageSize between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }

    const filter = TAB_FILTERS[tab];
    const counts = await this.notificationRepository.countTabs(userId);
    const totalPages = Math.ceil(counts[filter] / pageSize);
    const effectivePage = page > totalPages ? 1 : page;

    const rows = await this.notificationRepository.findPage(userId, filter, {
      offset: (effectivePage - 1) * pageSize,
      limit: pageSize,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        eventName: row.payload.eventName ?? null,
        createdAt: row.createdAt,
        readAt: row.readAt,
      })),
      counts,
      page: effectivePage,
      totalPages,
    };
  }
}
