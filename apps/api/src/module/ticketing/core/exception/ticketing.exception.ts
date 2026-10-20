import { UnprocessableEntityException } from '@nestjs/common';

export type TicketingExceptionReason =
  | 'INVALID_SELECTION'
  | 'SEATS_UNAVAILABLE'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_EXPIRED'
  | 'ORDER_ALREADY_PAID'
  | 'PAYMENT_IN_PROGRESS'
  | 'INVALID_CARD'
  | 'CARD_DECLINED'
  | 'CARD_NOT_FOUND'
  | 'CARD_ATTEMPTS_LIMITED'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_PAGE';

// A business failure returned to the client as a reason (AD-018), the same
// shape as IdentityException.
export class TicketingException extends UnprocessableEntityException {
  readonly reason: TicketingExceptionReason;
  readonly fields?: Record<string, string>;

  constructor(
    reason: TicketingExceptionReason,
    message: string,
    fields?: Record<string, string>,
  ) {
    // `statusCode` makes Nest's Apollo driver carry this body in
    // `extensions.originalError` (see IdentityException).
    super({ statusCode: 422, reason, message, fields });
    this.reason = reason;
    this.fields = fields;
  }
}
