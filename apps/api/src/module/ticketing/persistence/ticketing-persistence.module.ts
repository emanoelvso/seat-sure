import { Module } from '@nestjs/common';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { SeatHoldRepository } from './repository/seat-hold.repository';
import { TicketRepository } from './repository/ticket.repository';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'ticketing',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return dataSourceOptionsFactory(configService);
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        // @nestjs/typeorm merges `name: 'ticketing'` into `options` before
        // calling this factory, but it isn't part of `DataSourceOptions`.
        const { name } = options as DataSourceOptions & { name?: string };
        return addTransactionalDataSource({
          name, // must match connectionName in @Transactional
          dataSource: new DataSource(options),
        });
      },
    }),
  ],
  providers: [SeatHoldRepository, TicketRepository],
  exports: [SeatHoldRepository, TicketRepository],
})
export class TicketingPersistenceModule {}
