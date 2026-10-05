import { Injectable } from '@nestjs/common';
import {
  CodeSender,
  SendCodeInput,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

// The only place in the whole feature that logs a verification/reset code
// (dev-only sender; production never binds CodeSender to this provider).
@Injectable()
export class LogCodeSender implements CodeSender {
  constructor(private readonly logger: AppLogger) {}

  async send({ email, purpose, code }: SendCodeInput): Promise<void> {
    this.logger.log('Sending verification code', { email, purpose, code });
  }
}
