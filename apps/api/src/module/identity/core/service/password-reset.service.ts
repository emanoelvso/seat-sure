import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { normalizeEmail } from '@identityModule/core/model/credential-rules.model';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import {
  IssueCodeResult,
  VerificationCodeService,
} from '@identityModule/core/service/verification-code.service';
import { IdentityPasswordResetGrant } from '@identityModule/persistence/entity/identity-password-reset-grant.entity';
import { PasswordResetGrantRepository } from '@identityModule/persistence/repository/password-reset-grant.repository';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { Transactional } from 'typeorm-transactional';

const GRANT_TTL_MS = 10 * 60 * 1000;

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

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
