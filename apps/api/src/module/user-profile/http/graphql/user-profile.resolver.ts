import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { UserProfileService } from '@userProfileModule/core/service/user-profile.service';
import { ClsService } from 'nestjs-cls';
import { UpdateMyProfileInput } from './type/update-my-profile-input.type';
import { UserProfile } from './type/user-profile.type';
import { AccountSettings } from './type/account-settings.type';
import { UpdateMySettingsInput } from './type/update-my-settings-input.type';

@Resolver()
export class UserProfileResolver {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly clsService: ClsService,
  ) {}

  @UseGuards(AuthGuard)
  @Query(() => AccountSettings)
  async mySettings(): Promise<AccountSettings> {
    return this.userProfileService.findMySettings(
      this.clsService.get<string>('userId'),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => AccountSettings)
  async updateMySettings(
    @Args('input') input: UpdateMySettingsInput,
  ): Promise<AccountSettings> {
    return this.userProfileService.updateMySettings(
      this.clsService.get<string>('userId'),
      input,
    );
  }

  @UseGuards(AuthGuard)
  @Query(() => UserProfile)
  async myProfile(): Promise<UserProfile> {
    return this.userProfileService.findMyProfile(
      this.clsService.get<string>('userId'),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => UserProfile)
  async updateMyProfile(
    @Args('input') input: UpdateMyProfileInput,
  ): Promise<UserProfile> {
    return this.userProfileService.updateMyProfile(
      this.clsService.get<string>('userId'),
      input,
      new Date(),
    );
  }
}
