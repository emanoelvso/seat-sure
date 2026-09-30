import { Module } from '@nestjs/common';
import { join } from 'path';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Written on boot and committed: apps/web codegen reads it. Test apps
        // boot partial modules, so they keep the schema in memory.
        autoSchemaFile:
          configService.get('env') === 'test'
            ? true
            : join(process.cwd(), 'schema.gql'),
        sortSchema: true,
      }),
    }),
  ],
})
export class GraphqlModule {}
