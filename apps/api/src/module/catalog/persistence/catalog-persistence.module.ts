import { Module } from '@nestjs/common';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { EventRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { ArtistRepository } from './repository/artist.repository';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'catalog',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return dataSourceOptionsFactory(configService);
      },
    }),
  ],
  providers: [EventRepository, ArtistRepository],
  exports: [EventRepository, ArtistRepository],
})
export class CatalogPersistenceModule {}
