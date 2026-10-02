import { Injectable } from '@nestjs/common';
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
import { Transactional } from 'typeorm-transactional';

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
  ) {}

  @Transactional({ connectionName: 'identity' })
  async logIn(input: LogInInputModel, now: Date): Promise<LogInResultModel> {
    const email = normalizeEmail(input.email);

    await this.loginThrottleService.assertNotLocked(email, now);

    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      await this.loginThrottleService.recordFailure(email, now);
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

    return {
      status: LogInStatus.SIGNED_IN,
      session,
      codeSent: null,
      resendAvailableAt: null,
    };
  }
}
