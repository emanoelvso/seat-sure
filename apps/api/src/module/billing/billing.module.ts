import { Module } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingService } from '@billingModule/core/service/billing.service';
import { CardThrottleService } from '@billingModule/core/service/card-throttle.service';
import { PendingCardService } from '@billingModule/core/service/pending-card.service';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { BillingResolver } from '@billingModule/http/graphql/billing.resolver';
import { SimulatedBankController } from '@billingModule/http/rest/controller/simulated-bank.controller';
import {
  StripeClient,
  stripeClientFactory,
} from '@billingModule/integration/provider/stripe-client.provider';
import { paymentGatewayFactory } from '@billingModule/integration/provider/payment-gateway.provider';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { BillingPublicApiProvider } from '@billingModule/integration/provider/public-api.provider';
import { BillingCustomerRepository } from '@billingModule/persistence/repository/billing-customer.repository';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';

@Module({
  imports: [BillingPersistenceModule, AuthModule, LoggerModule],
  providers: [
    SimulatedPaymentGateway,
    {
      provide: StripeClient,
      inject: [ConfigService],
      useFactory: stripeClientFactory,
    },
    {
      provide: PaymentGateway,
      inject: [
        ConfigService,
        SimulatedPaymentGateway,
        StripeClient,
        BillingCustomerRepository,
      ],
      useFactory: paymentGatewayFactory,
    },
    BillingService,
    PaymentCardService,
    PendingCardService,
    CardThrottleService,
    BillingResolver,
    { provide: BillingApi, useClass: BillingPublicApiProvider },
  ],
  controllers: [SimulatedBankController],
  exports: [BillingApi],
})
export class BillingModule {}
