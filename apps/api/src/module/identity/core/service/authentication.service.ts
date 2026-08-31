import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../persistence/repository/user.repository';
import { compare } from 'bcrypt';
import { BillingSubscriptionStatusApi } from '@sharedModules/integration/interface/billing-integration.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @Inject(BillingSubscriptionStatusApi)
    private readonly subscriptionServiceClient: BillingSubscriptionStatusApi,
  ) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOneByEmail(email);

    if (!user || !(await this.comparePassword(password, user.password))) {
      throw new UnauthorizedException(`Cannot authorize user: ${email}`);
    }

    const isSubscriptionActive =
      await this.subscriptionServiceClient.isUserSubscriptionActive(user.id);

    if (!isSubscriptionActive) {
      throw new UnauthorizedException(
        `User subscription is not active: ${email}`,
      );
    }

    // TODO: add more fields to the JWT
    const payload = { sub: user.id };
    return {
      accessToken: await this.jwtService.signAsync(payload, {
        algorithm: 'HS256',
      }),
    };
  }

  private async comparePassword(
    password: string,
    actualPassword: string,
  ): Promise<boolean> {
    return compare(password, actualPassword);
  }
}
