import { Injectable } from '@nestjs/common';
import {
  SecurityAlertSender,
  SendSecurityAlertInput,
} from '@identityModule/core/adapter/security-alert-sender.adapter.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

// Dev-only sender; production never binds SecurityAlertSender to this
// provider.
@Injectable()
export class LogSecurityAlertSender implements SecurityAlertSender {
  constructor(private readonly logger: AppLogger) {}

  async send({ email, event }: SendSecurityAlertInput): Promise<void> {
    this.logger.log('Sending security alert', { email, event });
  }
}
