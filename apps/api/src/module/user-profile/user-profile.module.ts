import { Module } from '@nestjs/common';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { UserProfilePersistenceModule } from '@userProfileModule/persistence/user-profile-persistence.module';
import { UserProfileResolver } from './http/graphql/user-profile.resolver';
import { UserProfileService } from './core/service/user-profile.service';
import { UserProfilePublicApiProvider } from './integration/provider/public-api.provider';

@Module({
  imports: [UserProfilePersistenceModule, AuthModule],
  providers: [
    UserProfileResolver,
    UserProfileService,
    { provide: UserProfileApi, useClass: UserProfilePublicApiProvider },
  ],
  exports: [UserProfileApi],
})
export class UserProfileModule {}
