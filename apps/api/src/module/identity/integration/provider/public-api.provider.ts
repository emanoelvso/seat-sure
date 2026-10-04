import { Injectable } from '@nestjs/common';
import { IdentityApi } from '@sharedModules/integration/interface/identity-integration.interface';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { isUUID } from 'class-validator';

@Injectable()
export class IdentityPublicApiProvider implements IdentityApi {
  constructor(private readonly userRepository: UserRepository) {}

  async findAccountEmail(userId: string): Promise<string | null> {
    if (!isUUID(userId)) {
      return null;
    }

    const user = await this.userRepository.findOneById(userId);
    return user?.email ?? null;
  }
}
