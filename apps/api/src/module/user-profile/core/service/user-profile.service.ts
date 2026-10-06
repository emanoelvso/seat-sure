import { Injectable } from '@nestjs/common';
import { UserProfileSummary } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { UserProfileException } from '@userProfileModule/core/exception/user-profile.exception';
import { UserProfileModel } from '@userProfileModule/core/model/user-profile.model';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
import { UserProfileUser } from '@userProfileModule/persistence/entity/user-profile-user.entity';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly userProfileUserRepository: UserProfileUserRepository,
  ) {}

  @Transactional({ connectionName: 'user-profile' })
  async createProfile(input: {
    userId: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    await this.userProfileUserRepository.create({
      id: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
    });
  }

  async findProfile(userId: string): Promise<UserProfileSummary | null> {
    const user = await this.userProfileUserRepository.findOneById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async findMyProfile(userId: string): Promise<UserProfileModel> {
    const user = await this.userProfileUserRepository.findOneById(userId);
    if (!user) {
      throw new UserProfileException('PROFILE_NOT_FOUND', 'Profile not found.');
    }

    return this.toModel(user);
  }

  private toModel(user: UserProfileUser): UserProfileModel {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
      state: user.state ?? null,
      city: user.city ?? null,
      birthDate: user.birthDate ?? null,
      phoneCountryCode: user.phoneCountryCode ?? null,
      phoneNumber: user.phoneNumber ?? null,
      zipCode: user.zipCode ?? null,
    };
  }
}
