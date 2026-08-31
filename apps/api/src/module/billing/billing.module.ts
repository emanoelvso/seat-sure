import { Module } from '@nestjs/common';
import { BillingPersistenceModule } from './persistence/billing-persistence.module';
import { SubscriptionService } from './core/service/subscription.service';
import { SubscriptionController } from './http/rest/controller/subscription.controller';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { BillingPublicApiProvider } from './integration/provider/public-api.provider';

@Module({
  imports: [BillingPersistenceModule, AuthModule],
  providers: [SubscriptionService, BillingPublicApiProvider],
  controllers: [SubscriptionController],
  exports: [BillingPublicApiProvider],
})
export class BillingModule {}
