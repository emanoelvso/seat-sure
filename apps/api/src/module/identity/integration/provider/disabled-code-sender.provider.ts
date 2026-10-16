import { Injectable } from '@nestjs/common';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';

@Injectable()
export class DisabledCodeSender implements CodeSender {
  async send(): Promise<void> {
    throw new Error('Email delivery is disabled');
  }
}
