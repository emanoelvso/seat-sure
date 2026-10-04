import { Module } from '@nestjs/common';
import { PaymentGateway } from '@billingModule/core/adapter/payment-gateway.adapter.interface';
import { SimulatedPaymentGateway } from '@billingModule/integration/provider/simulated-payment-gateway.provider';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';

@Module({
  imports: [BillingPersistenceModule],
  providers: [{ provide: PaymentGateway, useClass: SimulatedPaymentGateway }],
})
export class BillingModule {}
