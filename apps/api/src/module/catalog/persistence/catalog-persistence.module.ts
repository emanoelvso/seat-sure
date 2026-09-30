import { Module } from '@nestjs/common';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { EventRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { ArtistRepository } from './repository/artist.repository';
import { TicketTypeRepository } from './repository/ticket-type.repository';
import { VenueRepository } from './repository/venue.repository';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'catalog',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return dataSourceOptionsFactory(configService);
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        // @nestjs/typeorm merges `name: 'catalog'` into `options` before
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
    EventRepository,
    ArtistRepository,
    TicketTypeRepository,
    VenueRepository,
  ],
  exports: [
    EventRepository,
    ArtistRepository,
    TicketTypeRepository,
    VenueRepository,
  ],
})
export class CatalogPersistenceModule {}
