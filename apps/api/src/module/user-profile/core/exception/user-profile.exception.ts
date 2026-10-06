import { UnprocessableEntityException } from '@nestjs/common';

export type UserProfileExceptionReason = 'INVALID_INPUT' | 'PROFILE_NOT_FOUND';

export class UserProfileException extends UnprocessableEntityException {
  readonly reason: UserProfileExceptionReason;
  readonly fields?: Record<string, string>;

  constructor(
    reason: UserProfileExceptionReason,
    message: string,
    fields?: Record<string, string>,
  ) {
    // Same body shape as IdentityException: `statusCode` must be present so
    // Nest's Apollo driver carries `reason` and `fields` in the error
    // extensions.
    super({ statusCode: 422, reason, message, fields });
    this.reason = reason;
    this.fields = fields;
  }
}
