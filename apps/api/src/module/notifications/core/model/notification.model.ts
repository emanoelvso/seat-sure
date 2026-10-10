import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';

export enum NotificationsTab {
  ALL = 'ALL',
  UNREAD = 'UNREAD',
  READ = 'READ',
}

export interface NotificationModel {
  id: string;
  type: NotificationType;
  // Null for a welcome, which names no event
  eventName: string | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationCountsModel {
  all: number;
  unread: number;
  read: number;
}

export interface NotificationsPageModel {
  items: NotificationModel[];
  counts: NotificationCountsModel;
  // The effective page: 1 when the requested one was past the end
  page: number;
  // Of the requested tab; 0 when the tab is empty
  totalPages: number;
}
