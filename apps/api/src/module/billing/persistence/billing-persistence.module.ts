import { Module } from '@nestjs/common';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { BillingPaymentRepository } from './repository/billing-payment.repository';
import { BillingPaymentCardRepository } from './repository/billing-payment-card.repository';
import { BillingSimulatedPaymentRepository } from './repository/billing-simulated-payment.repository';
import { BillingPendingCardRepository } from './repository/billing-pending-card.repository';
import { BillingCustomerRepository } from './repository/billing-customer.repository';
import { CardThrottleRepository } from './repository/card-throttle.repository';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'billing',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return dataSourceOptionsFactory(configService);
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        // @nestjs/typeorm merges `name: 'billing'` into `options` before
        // calling this factory, but it isn't part of `DataSourceOptions`.
        const { name } = options as DataSourceOptions & { name?: string };
        return addTransactionalDataSource({
          name, // must match connectionName in @Transactional
          dataSource: new DataSource(options),
        });
      },
    }),
  ],
  providers: [
    BillingPaymentRepository,
    BillingPaymentCardRepository,
    CardThrottleRepository,
    BillingSimulatedPaymentRepository,
    BillingPendingCardRepository,
    BillingCustomerRepository,
  ],
  exports: [
    BillingPaymentRepository,
    BillingPaymentCardRepository,
    CardThrottleRepository,
    BillingSimulatedPaymentRepository,
    BillingPendingCardRepository,
    BillingCustomerRepository,
  ],
})
export class BillingPersistenceModule {}
