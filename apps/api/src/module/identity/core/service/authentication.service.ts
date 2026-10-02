import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '@identityModule/core/model/credential-rules.model';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { LoginThrottleService } from '@identityModule/core/service/login-throttle.service';
import {
  SessionService,
  SessionTokensResult,
} from '@identityModule/core/service/session.service';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { LogInStatus } from '@identityModule/http/graphql/type/log-in-status.type';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Transactional } from 'typeorm-transactional';

export interface CurrentUserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface LogInInputModel {
  email: string;
  password: string;
  rememberMe: boolean;
}

export type LogInResultModel =
  | {
      status: LogInStatus.SIGNED_IN;
      session: SessionTokensResult;
      codeSent: null;
      resendAvailableAt: null;
    }
  | {
      status: LogInStatus.VERIFICATION_REQUIRED;
      session: null;
      codeSent: boolean;
      resendAvailableAt: Date;
    };

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly loginThrottleService: LoginThrottleService,
    private readonly sessionService: SessionService,
    private readonly verificationCodeService: VerificationCodeService,
    @Inject(UserProfileApi) private readonly userProfileApi: UserProfileApi,
    private readonly logger: AppLogger,
  ) {}

  @Transactional({ connectionName: 'identity' })
  async logIn(input: LogInInputModel, now: Date): Promise<LogInResultModel> {
    const email = normalizeEmail(input.email);

    try {
      await this.loginThrottleService.assertNotLocked(email, now);
    } catch (error) {
      this.logger.warn('login-locked', { email });
      throw error;
    }

    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      await this.loginThrottleService.recordFailure(email, now);
      this.logger.warn('login-failed', user ? { userId: user.id } : { email });
      throw new IdentityException(
        'INVALID_CREDENTIALS',
        'Incorrect email or password.',
      );
    }

    await this.loginThrottleService.clear(email);

    if (!user.emailVerifiedAt) {
      const { codeSent, resendAvailableAt } =
        await this.verificationCodeService.issue(user, 'verify_email', now);
      return {
        status: LogInStatus.VERIFICATION_REQUIRED,
        session: null,
        codeSent,
        resendAvailableAt,
      };
    }

    await this.userRepository.markLastLogin(user.id, now);
    const session = await this.sessionService.start(
      user.id,
      input.rememberMe,
      now,
    );

    this.logger.log('login-succeeded', { userId: user.id });

    return {
      status: LogInStatus.SIGNED_IN,
      session,
      codeSent: null,
      resendAvailableAt: null,
    };
  }

  async findCurrentUser(
    userId: string,
    sessionId: string,
    now: Date,
  ): Promise<CurrentUserModel> {
    await this.sessionService.assertActive(sessionId, now);

    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const profile = await this.userProfileApi.findProfile(userId);
    if (!profile) {
      this.logger.warn('No profile found for an authenticated user', {
        userId,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      avatarUrl: profile?.avatarUrl ?? null,
    };
  }
}
