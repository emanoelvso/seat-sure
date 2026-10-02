import { Injectable } from '@nestjs/common';
import { UserProfileSummary } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
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
}
