import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A NotificationsNotification row. The user is a plain id (no FK).
interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  channel: string;
  sourceId: string;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt?: Date;
}

export const notificationFactory = Factory.Sync.makeFactory<NotificationRow>({
  id: Factory.each(() => faker.string.uuid()),
  userId: Factory.each(() => faker.string.uuid()),
  type: 'purchase_confirmed',
  channel: 'in_app',
  sourceId: Factory.each(() => faker.string.uuid()),
  payload: { eventName: 'Rock in Rio' },
  readAt: null,
});
