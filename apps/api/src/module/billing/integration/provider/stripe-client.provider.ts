import Stripe from 'stripe';
import { ConfigService } from '@sharedModules/config/service/config.service';

// Injection token for the Stripe SDK client, so tests inject a stub and no
// suite ever reaches the network
export const StripeClient = Symbol('StripeClient');
export type StripeClient = Stripe;

export const stripeClientFactory = (configService: ConfigService): Stripe =>
  new Stripe(configService.get('billing.stripeSecretKey') as string);
