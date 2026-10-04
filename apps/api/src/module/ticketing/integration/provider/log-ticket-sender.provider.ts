import { Injectable } from '@nestjs/common';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import {
  SendTicketsInput,
  TicketSender,
} from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';

// Dev-only sender: the ticket notice is a log line (PAY-39).
@Injectable()
export class LogTicketSender implements TicketSender {
  constructor(private readonly logger: AppLogger) {}

  async send({ email, eventName, codes }: SendTicketsInput): Promise<void> {
    this.logger.log('Sending tickets', { email, eventName, codes });
  }
}
