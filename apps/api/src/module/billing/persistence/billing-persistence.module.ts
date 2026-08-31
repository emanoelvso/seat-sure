import { Module } from '@nestjs/common';
import { SubscriptionRepository } from './repository/subscription.repository';
import { PlanRepository } from './repository/plan.repository';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { ConfigModule } from '@sharedModules/config/config.module';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { ConfigService } from '@sharedModules/config/service/config.service';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'billing',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return dataSourceOptionsFactory(configService);
      },
    }),
  ],
  providers: [SubscriptionRepository, PlanRepository],
  exports: [SubscriptionRepository, PlanRepository],
})
export class BillingPersistenceModule {}
