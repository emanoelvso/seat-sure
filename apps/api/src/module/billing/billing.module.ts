import { Module } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingService } from '@billingModule/core/service/billing.service';
import { PaymentCardService } from '@billingModule/core/service/payment-card.service';
import { BillingResolver } from '@billingModule/http/graphql/billing.resolver';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { BillingPublicApiProvider } from '@billingModule/integration/provider/public-api.provider';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';

@Module({
  imports: [BillingPersistenceModule, AuthModule, LoggerModule],
  providers: [
    { provide: PaymentGateway, useClass: SimulatedPaymentGateway },
    BillingService,
    PaymentCardService,
    BillingResolver,
    { provide: BillingApi, useClass: BillingPublicApiProvider },
  ],
  exports: [BillingApi],
})
export class BillingModule {}
