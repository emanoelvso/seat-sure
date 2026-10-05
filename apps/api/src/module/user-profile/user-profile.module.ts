import { Module } from '@nestjs/common';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { UserProfilePersistenceModule } from '@userProfileModule/persistence/user-profile-persistence.module';
import { UserProfileService } from './core/service/user-profile.service';
import { UserProfilePublicApiProvider } from './integration/provider/public-api.provider';

@Module({
  imports: [UserProfilePersistenceModule],
  providers: [
    UserProfileService,
    { provide: UserProfileApi, useClass: UserProfilePublicApiProvider },
  ],
  exports: [UserProfileApi],
})
export class UserProfileModule {}
