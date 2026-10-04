import { BillingModule } from '@billingModule/billing.module';
import { CatalogModule } from '@catalogModule/catalog.module';
import { IdentityModule } from '@identityModule/identity.module';
import { Module } from '@nestjs/common';
import { GraphqlModule } from '@sharedModules/graphql/graphql.module';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';

@Module({
  imports: [
    GraphqlModule,
    CatalogModule,
    TicketingModule,
    UserProfileModule,
    IdentityModule,
    BillingModule,
  ],
})
export class AppModule {}
