import { UnprocessableEntityException } from '@nestjs/common';

// A business failure returned to the client as a reason (AD-018), the same
// shape as TicketingException. The client may retry the same request.
export class AdmissionBusyException extends UnprocessableEntityException {
  readonly reason = 'BUSY';

  constructor() {
    // `statusCode` makes Nest's Apollo driver carry this body in
    // `extensions.originalError` (see TicketingException).
    super({
      statusCode: 422,
      reason: 'BUSY',
      message: 'We are handling a lot of requests. Try again in a moment.',
    });
  }
}
