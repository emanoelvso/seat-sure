import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  normalizeEmail,
  validatePassword,
} from '@identityModule/core/model/credential-rules.model';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { SessionService } from '@identityModule/core/service/session.service';
import {
  IssueCodeResult,
  VerificationCodeService,
} from '@identityModule/core/service/verification-code.service';
import { IdentityPasswordResetGrant } from '@identityModule/persistence/entity/identity-password-reset-grant.entity';
import { PasswordResetGrantRepository } from '@identityModule/persistence/repository/password-reset-grant.repository';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Transactional } from 'typeorm-transactional';

const GRANT_TTL_MS = 10 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export interface PasswordResetGrantResult {
  resetToken: string;
  expiresAt: Date;
}

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly passwordResetGrantRepository: PasswordResetGrantRepository,
    private readonly sessionService: SessionService,
    private readonly logger: AppLogger,
  ) {}

  // Same no-enumeration shape as `VerificationCodeService.resend`: a reset
  // code is only ever issued for an email that has an account, but the
  // caller can't tell the two cases apart from the response.
  async requestReset(email: string, now: Date): Promise<IssueCodeResult> {
    return this.verificationCodeService.resend(email, 'reset_password', now);
  }

  @Transactional({ connectionName: 'identity' })
  async confirmCode(
    email: string,
    code: string,
    now: Date,
  ): Promise<PasswordResetGrantResult> {
    const user = await this.userRepository.findByEmail(normalizeEmail(email));
    if (!user) {
      throw new IdentityException(
        'CODE_INCORRECT',
        'Incorrect code. Please try again.',
      );
    }

    await this.verificationCodeService.consume(
      user,
      'reset_password',
      code,
      now,
    );

    const resetToken = this.generateToken();
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(now.getTime() + GRANT_TTL_MS);

    await this.passwordResetGrantRepository.save(
      new IdentityPasswordResetGrant({
        userId: user.id,
        tokenHash,
        expiresAt,
        createdAt: now,
      }),
    );

    return { resetToken, expiresAt };
  }

  @Transactional({ connectionName: 'identity' })
  async resetPassword(
    resetToken: string,
    newPassword: string,
    now: Date,
  ): Promise<void> {
    const passwordMessage = validatePassword(newPassword);
    if (passwordMessage) {
      throw new IdentityException(
        'INVALID_INPUT',
        'Check the highlighted fields.',
        { password: passwordMessage },
      );
    }

    const tokenHash = this.hashToken(resetToken);
    const grant =
      await this.passwordResetGrantRepository.findByTokenHash(tokenHash);
    if (!grant || grant.usedAt || now.getTime() > grant.expiresAt.getTime()) {
      throw new IdentityException(
        'RESET_GRANT_INVALID',
        'This reset link is no longer valid.',
      );
    }

    const consumed = await this.passwordResetGrantRepository.markUsed(
      grant.id,
      now,
    );
    if (!consumed) {
      throw new IdentityException(
        'RESET_GRANT_INVALID',
        'This reset link is no longer valid.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepository.updatePasswordHash(grant.userId, passwordHash);

    const user = await this.userRepository.findOneById(grant.userId);
    if (user && !user.emailVerifiedAt) {
      await this.userRepository.markEmailVerified(grant.userId, now);
    }

    await this.sessionService.revokeAll(grant.userId, now);

    this.logger.log('password-reset', { userId: grant.userId });
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
