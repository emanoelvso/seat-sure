import { UnprocessableEntityException } from '@nestjs/common';

export type IdentityExceptionReason =
  | 'INVALID_INPUT'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'LOGIN_LOCKED'
  | 'CODE_INCORRECT'
  | 'CODE_EXPIRED'
  | 'CODE_ATTEMPTS_EXCEEDED'
  | 'RESEND_TOO_SOON'
  | 'RESET_GRANT_INVALID';

export class IdentityException extends UnprocessableEntityException {
  readonly reason: IdentityExceptionReason;
  readonly fields?: Record<string, string>;

  constructor(
    reason: IdentityExceptionReason,
    message: string,
    fields?: Record<string, string>,
  ) {
    super({ reason, message, fields });
    this.reason = reason;
    this.fields = fields;
  }
}
