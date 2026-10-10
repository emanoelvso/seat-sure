import { UnprocessableEntityException } from '@nestjs/common';

export type NotificationsExceptionReason =
  'INVALID_PAGE' | 'NOTIFICATION_NOT_FOUND';

export class NotificationsException extends UnprocessableEntityException {
  readonly reason: NotificationsExceptionReason;

  constructor(reason: NotificationsExceptionReason, message: string) {
    // Same body shape as UserProfileException: `statusCode` must be present
    // so Nest's Apollo driver carries `reason` in the error extensions.
    super({ statusCode: 422, reason, message });
    this.reason = reason;
  }
}
