import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  validateSignUpCredentials,
  normalizeEmail,
} from '@identityModule/core/model/credential-rules.model';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { SecurityAlertSender } from '@identityModule/core/adapter/security-alert-sender.adapter.interface';
import {
  IssueCodeResult,
  VerificationCodeService,
} from '@identityModule/core/service/verification-code.service';
import {
  SessionService,
  SessionTokensResult,
} from '@identityModule/core/service/session.service';
import { IdentityUser } from '@identityModule/persistence/entity/identity-user.entity';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { NotificationsApi } from '@sharedModules/integration/interface/notifications-integration.interface';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { QueryFailedError } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

const UNIQUE_VIOLATION = '23505';
const BCRYPT_ROUNDS = 10;
const RESEND_COOLDOWN_MS = 60 * 1000;

export interface SignUpInputModel {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignUpResultModel extends IssueCodeResult {
  email: string;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(UserProfileApi) private readonly userProfileApi: UserProfileApi,
    @Inject(NotificationsApi)
    private readonly notificationsApi: NotificationsApi,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly sessionService: SessionService,
    @Inject(SecurityAlertSender)
    private readonly securityAlertSender: SecurityAlertSender,
    private readonly logger: AppLogger,
  ) {}

  async signUp(input: SignUpInputModel, now: Date): Promise<SignUpResultModel> {
    const { value, fields } = validateSignUpCredentials(input);
    if (!value) {
      throw new IdentityException(
        'INVALID_INPUT',
        'Check the highlighted fields.',
        fields,
      );
    }

    let user: IdentityUser;
    try {
      user = await this.createUser(value, now);
    } catch (error) {
      if (
        error instanceof IdentityException &&
        error.reason === 'EMAIL_TAKEN'
      ) {
        return this.handleDuplicateSignUp(value.email, now);
      }
      throw error;
    }

    try {
      await this.userProfileApi.createProfile({
        userId: user.id,
        firstName: value.firstName,
        lastName: value.lastName,
      });
    } catch {
      await this.userRepository.hardDeleteById(user.id);
      throw new InternalServerErrorException(
        'Something went wrong. Please try again.',
      );
    }

    const { codeSent, resendAvailableAt } =
      await this.verificationCodeService.issue(user, 'verify_email', now);

    await this.notifyWelcome(user.id, now);

    this.logger.log('signup', { userId: user.id });

    return { email: user.email, codeSent, resendAvailableAt };
  }

  // The account exists whatever happens here, so a failure is only logged,
  // with the user id and type and never the notification (NOTIF-04)
  private async notifyWelcome(userId: string, now: Date): Promise<void> {
    try {
      await this.notificationsApi.notifyWelcome({ userId, now });
    } catch {
      this.logger.error("Couldn't store the notification", {
        userId,
        type: 'welcome',
      });
    }
  }

  @Transactional({ connectionName: 'identity' })
  async verifyEmail(
    input: { email: string; code: string; rememberMe: boolean },
    now: Date,
  ): Promise<SessionTokensResult> {
    const email = normalizeEmail(input.email);
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new IdentityException(
        'CODE_INCORRECT',
        'Incorrect code. Please try again.',
      );
    }

    await this.verificationCodeService.consume(
      user,
      'verify_email',
      input.code,
      now,
    );

    await this.userRepository.markEmailVerified(user.id, now);

    this.logger.log('email-verified', { userId: user.id });

    return this.sessionService.start(user.id, input.rememberMe, now);
  }

  // Mirrors a real signup's response shape instead of surfacing EMAIL_TAKEN,
  // so the caller can't tell an existing email from a new one (OWASP
  // user-enumeration); the existing account is alerted instead.
  private async handleDuplicateSignUp(
    email: string,
    now: Date,
  ): Promise<SignUpResultModel> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      await this.securityAlertSender.send({
        email: existing.email,
        event: 'duplicate_sign_up_attempt',
      });
    }

    return {
      email,
      codeSent: true,
      resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
    };
  }

  @Transactional({ connectionName: 'identity' })
  private async createUser(
    value: { email: string; password: string },
    now: Date,
  ): Promise<IdentityUser> {
    const passwordHash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);

    try {
      return await this.userRepository.save(
        new IdentityUser({
          email: value.email,
          passwordHash,
          emailVerifiedAt: null,
          lastLoginAt: null,
          createdAt: now,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new IdentityException(
          'EMAIL_TAKEN',
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }
}
