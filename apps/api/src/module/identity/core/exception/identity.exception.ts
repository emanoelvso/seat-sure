import { UnprocessableEntityException } from '@nestjs/common';

export type IdentityExceptionReason =
  | 'DEMO_ONLY'
  | 'DEMO_DISABLED'
  | 'INVALID_INPUT'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'LOGIN_LOCKED'
  | 'CODE_INCORRECT'
  | 'CODE_EXPIRED'
  | 'CODE_ATTEMPTS_EXCEEDED'
  | 'RESEND_TOO_SOON'
  | 'RESET_GRANT_INVALID'
  | 'DELETION_NOT_CONFIRMED'
  | 'ACCOUNT_HAS_ACTIVE_ORDERS';

export class IdentityException extends UnprocessableEntityException {
  readonly reason: IdentityExceptionReason;
  readonly fields?: Record<string, string>;

  constructor(
    reason: IdentityExceptionReason,
    message: string,
    fields?: Record<string, string>,
  ) {
    // `statusCode` must be present on the response body: Nest's Apollo
    // driver only treats a thrown error as an HttpException (and maps it to
    // `extensions.code: BAD_USER_INPUT`, carrying this body in
    // `extensions.originalError`) when `response.statusCode` is set.
    super({ statusCode: 422, reason, message, fields });
    this.reason = reason;
    this.fields = fields;
  }
}
