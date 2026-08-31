import { DynamicModule } from '@nestjs/common';
import {
  ConfigModuleOptions as NestConfigModuleOptions,
  // eslint-disable-next-line no-restricted-imports
  ConfigModule as NestConfigModule,
} from '@nestjs/config';
import { factory } from './util/config.factory';
import { ConfigService } from './service/config.service';

export class ConfigModule {
  static forRoot(options?: NestConfigModuleOptions): DynamicModule {
    return {
      module: ConfigModule,
      imports: [
        NestConfigModule.forRoot({
          ...options,
          expandVariables: true,
          load: options?.load ? [factory, ...options.load] : [factory],
        }),
      ],
      exports: [ConfigService],
      providers: [ConfigService],
    };
  }
}
