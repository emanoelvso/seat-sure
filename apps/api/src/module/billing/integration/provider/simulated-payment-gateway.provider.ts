import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  ChargeInput,
  ChargeResult,
  PaymentGateway,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { normalizeNumber } from '@billingModule/core/util/card-rules';

const DECLINED_NUMBER = '4000000000000002';

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  async charge({ card }: ChargeInput): Promise<ChargeResult> {
    if (normalizeNumber(card.number) === DECLINED_NUMBER) {
      return { status: 'failed', reason: 'card_declined' };
    }

    return { status: 'succeeded', providerPaymentId: `sim_${randomUUID()}` };
  }

  async refund(): Promise<void> {
    return;
  }
}
