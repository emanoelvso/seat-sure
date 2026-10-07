import { Injectable } from '@nestjs/common';
import { NotificationType } from '@notificationsModule/core/enum/notification-type.enum';
import { NotificationService } from '@notificationsModule/core/service/notification.service';
import {
  NotificationsApi,
  NotifyPaymentUnsuccessfulInput,
  NotifyPurchaseConfirmedInput,
  NotifyWelcomeInput,
} from '@sharedModules/integration/interface/notifications-integration.interface';

@Injectable()
export class NotificationsPublicApiProvider implements NotificationsApi {
  constructor(private readonly notificationService: NotificationService) {}

  async notifyWelcome(input: NotifyWelcomeInput): Promise<void> {
    return this.notificationService.create({
      userId: input.userId,
      type: NotificationType.WELCOME,
      sourceId: input.userId,
      payload: {},
      now: input.now,
    });
  }

  async notifyPurchaseConfirmed(
    input: NotifyPurchaseConfirmedInput,
  ): Promise<void> {
    return this.notificationService.create({
      userId: input.userId,
      type: NotificationType.PURCHASE_CONFIRMED,
      sourceId: input.orderId,
      payload: { eventName: input.eventName },
      now: input.now,
    });
  }

  async notifyPaymentUnsuccessful(
    input: NotifyPaymentUnsuccessfulInput,
  ): Promise<void> {
    return this.notificationService.create({
      userId: input.userId,
      type: NotificationType.PAYMENT_UNSUCCESSFUL,
      sourceId: input.paymentId,
      payload: { eventName: input.eventName },
      now: input.now,
    });
  }
}
