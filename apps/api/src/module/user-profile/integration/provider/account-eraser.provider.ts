import { Injectable } from '@nestjs/common';
import {
  AccountEraser,
  AccountErasure,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';

// Found by Identity through DiscoveryService when it deletes an account
@AccountErasure()
@Injectable()
export class UserProfileAccountEraser implements AccountEraser {
  readonly name = 'user-profile';

  constructor(private readonly users: UserProfileUserRepository) {}

  async erase(userId: string): Promise<void> {
    await this.users.hardDeleteById(userId);
  }
}
