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
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { QueryFailedError } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

const UNIQUE_VIOLATION = '23505';
const BCRYPT_ROUNDS = 10;

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
    private readonly verificationCodeService: VerificationCodeService,
    private readonly sessionService: SessionService,
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

    const user = await this.createUser(value, now);

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

    return { email: user.email, codeSent, resendAvailableAt };
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

    return this.sessionService.start(user.id, input.rememberMe, now);
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
