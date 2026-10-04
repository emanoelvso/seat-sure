import { Module } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { BillingService } from '@billingModule/core/service/billing.service';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { BillingPublicApiProvider } from '@billingModule/integration/provider/public-api.provider';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';
import { BillingApi } from '@sharedModules/integration/interface/billing-integration.interface';

@Module({
  imports: [BillingPersistenceModule],
  providers: [
    { provide: PaymentGateway, useClass: SimulatedPaymentGateway },
    BillingService,
    { provide: BillingApi, useClass: BillingPublicApiProvider },
  ],
  exports: [BillingApi],
})
export class BillingModule {}
