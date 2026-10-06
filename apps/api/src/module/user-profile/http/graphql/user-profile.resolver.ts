import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { UserProfileService } from '@userProfileModule/core/service/user-profile.service';
import { ClsService } from 'nestjs-cls';
import { UserProfile } from './type/user-profile.type';

@Resolver()
export class UserProfileResolver {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly clsService: ClsService,
  ) {}

  @UseGuards(AuthGuard)
  @Query(() => UserProfile)
  async myProfile(): Promise<UserProfile> {
    return this.userProfileService.findMyProfile(
      this.clsService.get<string>('userId'),
    );
  }
}
