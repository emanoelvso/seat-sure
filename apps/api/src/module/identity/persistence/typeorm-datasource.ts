import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@sharedModules/config/config.module';
import { DataSource } from 'typeorm';
import { dataSourceOptionsFactory } from './typeorm-datasource.factory';
import { ConfigService } from '@sharedModules/config/service/config.service';

const getDataSource = async (): Promise<DataSource> => {
  const configModule = await NestFactory.createApplicationContext(
    ConfigModule.forRoot(),
  );

  const configService = configModule.get<ConfigService>(ConfigService);

  return new DataSource(dataSourceOptionsFactory(configService));
};

export default getDataSource();
