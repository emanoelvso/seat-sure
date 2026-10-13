import { UnprocessableEntityException } from '@nestjs/common';

export type CatalogExceptionReason = 'SEAT_MAP_VENUE_MISMATCH';

// A business failure returned to the client as a reason (AD-018), the same
// shape as TicketingException.
export class CatalogException extends UnprocessableEntityException {
  readonly reason: CatalogExceptionReason;

  constructor(reason: CatalogExceptionReason, message: string) {
    // `statusCode` makes Nest's Apollo driver carry this body in
    // `extensions.originalError` (see IdentityException).
    super({ statusCode: 422, reason, message });
    this.reason = reason;
  }
}
