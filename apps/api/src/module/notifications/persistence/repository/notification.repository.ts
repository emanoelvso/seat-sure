import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationsNotification } from '@notificationsModule/persistence/entity/notifications-notification.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, IsNull, Not } from 'typeorm';

export type NotificationTabFilter = 'all' | 'unread' | 'read';

export interface NotificationTabCounts {
  all: number;
  unread: number;
  read: number;
}

@Injectable()
export class NotificationRepository extends DefaultTypeOrmRepository<NotificationsNotification> {
  constructor(
    @InjectDataSource('notifications')
    readonly datasource: DataSource,
  ) {
    super(NotificationsNotification, datasource.manager);
  }

  // A repeated trigger (same user, type, and source) stores nothing
  async insertIgnoringDuplicate(row: NotificationsNotification): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .insert()
      .into(NotificationsNotification)
      .values(row)
      .orIgnore()
      .execute();
  }

  async countTabs(userId: string): Promise<NotificationTabCounts> {
    const row = await this.entityManager
      .createQueryBuilder(NotificationsNotification, 'n')
      .select('COUNT(*)', 'all')
      .addSelect('COUNT(*) FILTER (WHERE n."readAt" IS NULL)', 'unread')
      .addSelect('COUNT(*) FILTER (WHERE n."readAt" IS NOT NULL)', 'read')
      .where('n."userId" = :userId', { userId })
      .getRawOne<{ all: string; unread: string; read: string }>();

    return {
      all: Number(row?.all ?? 0),
      unread: Number(row?.unread ?? 0),
      read: Number(row?.read ?? 0),
    };
  }

  // Newest first, ties broken by id descending (View AC 6)
  async findPage(
    userId: string,
    tab: NotificationTabFilter,
    { offset, limit }: { offset: number; limit: number },
  ): Promise<NotificationsNotification[]> {
    const readAt =
      tab === 'unread' ? IsNull() : tab === 'read' ? Not(IsNull()) : undefined;

    return this.entityManager.find(NotificationsNotification, {
      where: { userId, ...(readAt ? { readAt } : {}) },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  // Keeps the first read time. Null when the id is missing or not the user's.
  async markRead(
    userId: string,
    id: string,
    now: Date,
  ): Promise<NotificationsNotification | null> {
    const result = await this.entityManager
      .createQueryBuilder()
      .update(NotificationsNotification)
      .set({ readAt: () => 'COALESCE("readAt", :now)' })
      .setParameter('now', now)
      .where('id = :id AND "userId" = :userId', { id, userId })
      .execute();

    if (!result.affected) {
      return null;
    }
    return this.entityManager.findOne(NotificationsNotification, {
      where: { id, userId },
    });
  }

  // Only rows that existed at `now` are marked (Mark all AC 6)
  async markAllRead(userId: string, now: Date): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(NotificationsNotification)
      .set({ readAt: now })
      .where(
        '"userId" = :userId AND "readAt" IS NULL AND "createdAt" <= :now',
        {
          userId,
          now,
        },
      )
      .execute();
  }

  // A true DELETE of every notification the user has, read or not
  async deleteAllForUser(userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(NotificationsNotification)
      .where('"userId" = :userId', { userId })
      .execute();
  }
}
