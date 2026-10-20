import Stripe from 'stripe';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { StripePaymentGateway } from '@billingModule/integration/provider/stripe-payment-gateway.provider';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';

// The adapter follows `billing.gateway` (GW-33)
export const paymentGatewayFactory = (
  configService: ConfigService,
  simulated: SimulatedPaymentGateway,
  stripe: Stripe | null,
  customers: BillingCustomerRepository,
): PaymentGateway =>
  configService.get('billing.gateway') === 'stripe' && stripe
    ? new StripePaymentGateway(stripe, configService, customers)
    : simulated;
