import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from '@notificationsModule/core/service/notification.service';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { ClsService } from 'nestjs-cls';
import { MyNotificationsInput } from './type/my-notifications-input.type';
import { NotificationsPage } from './type/notification.type';

// The caller is always the session's user: no operation takes a user id
// (View AC 19)
@Resolver()
export class NotificationsResolver {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly clsService: ClsService,
  ) {}

  @UseGuards(AuthGuard)
  @Query(() => NotificationsPage)
  async myNotifications(
    @Args('input') input: MyNotificationsInput,
  ): Promise<NotificationsPage> {
    return this.notificationService.list(
      this.clsService.get<string>('userId'),
      input,
    );
  }
}
