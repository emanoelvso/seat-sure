import { UnprocessableEntityException } from '@nestjs/common';

export type BillingExceptionReason =
  'INVALID_CARD' | 'DUPLICATE_CARD' | 'CARD_LIMIT_REACHED' | 'CARD_DECLINED';

// Mirrors IdentityException (AD-018): a business error carried as a typed
// reason + field errors, not a generic 500.
export class BillingException extends UnprocessableEntityException {
  readonly reason: BillingExceptionReason;
  readonly fields?: Record<string, string>;

  constructor(
    reason: BillingExceptionReason,
    message: string,
    fields?: Record<string, string>,
  ) {
    super({ statusCode: 422, reason, message, fields });
    this.reason = reason;
    this.fields = fields;
  }
}
