import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

export interface NotificationPayload {
  eventName?: string;
}

// An in-app notification (AD-027). The user is a plain id of another module,
// with no foreign key. `sourceId` is the fact that caused it (user, order, or
// payment id), so a repeated trigger can't store a second one.
// Unread means `readAt` is null.
@Entity('NotificationsNotification')
@Unique(['userId', 'type', 'sourceId'])
@Index(['userId', 'createdAt'])
export class NotificationsNotification extends DefaultEntity<NotificationsNotification> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  channel: 'in_app';

  @Column({ type: 'varchar', length: 64 })
  sourceId: string;

  @Column({ type: 'jsonb' })
  payload: NotificationPayload;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;
}
