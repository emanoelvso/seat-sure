import { Module } from '@nestjs/common';
import { TypeOrmPersistenceModule } from '@sharedModules/persistence/typeorm/typeorm-persistence.module';
import { ConfigModule } from '@sharedModules/config/config.module';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { VideoRepository } from './repository/video.repository';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      imports: [ConfigModule.forRoot()],
      name: 'content',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): PostgresDataSourceOptions => {
        return dataSourceOptionsFactory(configService);
      },
      dataSourceFactory: async (options): Promise<DataSource> => {
        if (!options) {
          throw new Error('Invalid options passed');
        }

        return addTransactionalDataSource({
          name: 'content',
          dataSource: new DataSource(options),
        });
      },
    }),
  ],
  providers: [VideoRepository],
  exports: [VideoRepository],
})
export class ContentSharedPersistenceModule {}
