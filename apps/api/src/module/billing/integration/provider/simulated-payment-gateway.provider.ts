import { createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  ChargeInput,
  ChargeResult,
  PaymentGateway,
  TokenizeResult,
} from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import {
  CardInput,
  normalizeNumber,
} from '@billingModule/core/util/card-rules';
import { ConfigService } from '@sharedModules/config/service/config.service';

// Declined by both tokenize and charge
const DECLINED_NUMBER = '4000000000000002';
// Tokenizes, but charging its token declines (Stripe's "attach OK, charge
// fails" test card)
const TOKEN_DECLINED_NUMBER = '4000000000000341';
const TOKEN_PREFIX = 'sim_pm_';
const DECLINING_TOKEN_PREFIX = 'sim_pm_decline_';

@Injectable()
export class SimulatedPaymentGateway implements PaymentGateway {
  constructor(private readonly configService: ConfigService) {}

  // The fingerprint is a keyed HMAC of the digits, so a leaked table can't be
  // brute-forced back to card numbers without the secret (AD-026)
  async tokenize(card: CardInput): Promise<TokenizeResult> {
    const digits = normalizeNumber(card.number);

    if (digits === DECLINED_NUMBER) {
      return { status: 'failed', reason: 'card_declined' };
    }

    const prefix =
      digits === TOKEN_DECLINED_NUMBER ? DECLINING_TOKEN_PREFIX : TOKEN_PREFIX;
    const fingerprint = createHmac(
      'sha256',
      this.configService.get('billing.fingerprintSecret'),
    )
      .update(digits)
      .digest('hex');

    return {
      status: 'succeeded',
      token: `${prefix}${randomUUID()}`,
      fingerprint,
    };
  }

  async detach(): Promise<void> {
    return;
  }

  async charge({ source }: ChargeInput): Promise<ChargeResult> {
    const declined =
      source.type === 'card'
        ? normalizeNumber(source.card.number) === DECLINED_NUMBER
        : source.token.startsWith(DECLINING_TOKEN_PREFIX);

    if (declined) {
      return { status: 'failed', reason: 'card_declined' };
    }

    return { status: 'succeeded', providerPaymentId: `sim_${randomUUID()}` };
  }

  async refund(): Promise<void> {
    return;
  }
}
