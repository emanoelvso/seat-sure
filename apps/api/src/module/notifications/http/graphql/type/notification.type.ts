import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import {
  NotificationCountsModel,
  NotificationModel,
  NotificationsPageModel,
} from '@notificationsModule/core/model/notification.model';

registerEnumType(NotificationType, { name: 'NotificationType' });

@ObjectType('Notification')
export class Notification implements NotificationModel {
  @Field(() => ID)
  id: string;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field(() => String, { nullable: true })
  eventName: string | null;

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  readAt: Date | null;
}

@ObjectType('NotificationCounts')
export class NotificationCounts implements NotificationCountsModel {
  @Field(() => Int)
  all: number;

  @Field(() => Int)
  unread: number;

  @Field(() => Int)
  read: number;
}

@ObjectType('NotificationsPage')
export class NotificationsPage implements NotificationsPageModel {
  @Field(() => [Notification])
  items: Notification[];

  @Field(() => NotificationCounts)
  counts: NotificationCounts;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}
