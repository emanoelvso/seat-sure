import { Module } from '@nestjs/common';
import { BillingPersistenceModule } from '@billingModule/persistence/billing-persistence.module';

@Module({
  imports: [BillingPersistenceModule],
})
export class BillingModule {}
