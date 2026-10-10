import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { NotificationsTab } from '@notificationsModule/core/model/notification.model';
import { IsEnum, IsInt } from 'class-validator';

registerEnumType(NotificationsTab, { name: 'NotificationsTab' });

@InputType()
export class MyNotificationsInput {
  @IsEnum(NotificationsTab)
  @Field(() => NotificationsTab, { defaultValue: NotificationsTab.ALL })
  tab: NotificationsTab;

  // Bounds are checked by NotificationService, which throws INVALID_PAGE
  // (422, BAD_USER_INPUT) like AccountOrdersService: a ValidationPipe error
  // would be a 400.
  @IsInt()
  @Field(() => Int)
  page: number;

  @IsInt()
  @Field(() => Int)
  pageSize: number;
}
