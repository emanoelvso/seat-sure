import { Module } from '@nestjs/common';
import { AuthService } from './core/service/authentication.service';
import { AuthResolver } from './http/graphql/auth.resolver';
import { UserResolver } from './http/graphql/user.resolver';
import { UserManagementService } from './core/service/user-management.service';
import { UserRepository } from './persistence/repository/user.repository';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DomainModuleIntegrationModule } from '@sharedModules/integration/interface/domain-module-integration.module';
import { BillingSubscriptionStatusApi } from '@sharedModules/integration/interface/billing-integration.interface';
import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { BillingSubscriptionHttpClient } from '@sharedModules/integration/client/billing-subscription-http.client';
import { AuthModule } from '@sharedModules/auth/auth.module';

@Module({
  imports: [
    IdentityPersistenceModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      driver: ApolloDriver,
    }),
    DomainModuleIntegrationModule,
    AuthModule,
  ],
  providers: [
    {
      provide: BillingSubscriptionStatusApi,
      useExisting: BillingSubscriptionHttpClient,
    },
    AuthService,
    AuthResolver,
    UserResolver,
    UserManagementService,
    UserRepository,
  ],
})
export class IdentityModule {}
