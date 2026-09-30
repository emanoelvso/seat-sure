import { Module } from '@nestjs/common';
import { join } from 'path';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      // Written on boot and committed: apps/web codegen reads it.
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      driver: ApolloDriver,
    }),
  ],
})
export class GraphqlModule {}
