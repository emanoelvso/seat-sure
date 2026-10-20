import Stripe from 'stripe';
import { ConfigService } from '@sharedModules/config/service/config.service';

// Injection token for the Stripe SDK client, so tests inject a stub and no
// suite ever reaches the network. The client only exists in stripe mode; the
// config schema guarantees a test-mode key there (GW-34).
export const StripeClient = Symbol('StripeClient');

export const stripeClientFactory = (
  configService: ConfigService,
): Stripe | null =>
  configService.get('billing.gateway') === 'stripe'
    ? new Stripe(configService.get('billing.stripeSecretKey') as string)
    : null;
