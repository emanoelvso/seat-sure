import { Injectable } from '@nestjs/common';
import {
  CreateProfileInput,
  UserProfileApi,
  UserProfileSummary,
} from '@sharedModules/integration/interface/user-profile-integration.interface';
import { UserProfileService } from '@userProfileModule/core/service/user-profile.service';

@Injectable()
export class UserProfilePublicApiProvider implements UserProfileApi {
  constructor(private readonly userProfileService: UserProfileService) {}

  async createProfile(input: CreateProfileInput): Promise<void> {
    return this.userProfileService.createProfile(input);
  }

  async findProfile(userId: string): Promise<UserProfileSummary | null> {
    return this.userProfileService.findProfile(userId);
  }
}
