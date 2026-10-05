import { randomInt } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  CodeSender,
  CodeSenderPurpose,
} from '@identityModule/core/adapter/code-sender.adapter.interface';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { IdentityUser } from '@identityModule/persistence/entity/identity-user.entity';
import { IdentityVerificationCode } from '@identityModule/persistence/entity/identity-verification-code.entity';
import { VerificationCodeRepository } from '@identityModule/persistence/repository/verification-code.repository';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { normalizeEmail } from '@identityModule/core/model/credential-rules.model';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Transactional } from 'typeorm-transactional';

const CODE_LENGTH = 6;
const COOLDOWN_MS = 60 * 1000;
const EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

export interface IssueCodeResult {
  codeSent: boolean;
  resendAvailableAt: Date;
}

@Injectable()
export class VerificationCodeService {
  constructor(
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly userRepository: UserRepository,
    @Inject(CodeSender) private readonly codeSender: CodeSender,
    private readonly logger: AppLogger,
  ) {}

  // Always returns the same shape, whether the email exists or not, and
  // whether a verify_email code is even still relevant (already verified):
  // the caller can't distinguish "unknown email" from "nothing to resend"
  // from "we actually sent it", which is what keeps this endpoint from
  // leaking which emails have accounts.
  async resend(
    email: string,
    purpose: CodeSenderPurpose,
    now: Date,
  ): Promise<IssueCodeResult> {
    const resendAvailableAt = new Date(now.getTime() + COOLDOWN_MS);
    const user = await this.userRepository.findByEmail(normalizeEmail(email));

    if (!user) {
      return { codeSent: true, resendAvailableAt };
    }

    if (purpose === 'verify_email' && user.emailVerifiedAt) {
      return { codeSent: true, resendAvailableAt };
    }

    return this.issue(user, purpose, now);
  }

  // Used by an unverified login: if a code sent within the last COOLDOWN_MS
  // is still confirmable, reuse it (same resendAvailableAt, no new code
  // dispatched) instead of calling `issue`, which would throw
  // RESEND_TOO_SOON. If the latest code is consumed, expired, or simply
  // older than the cooldown, issue a fresh one as usual.
  async issueOrReuse(
    user: IdentityUser,
    purpose: CodeSenderPurpose,
    now: Date,
  ): Promise<IssueCodeResult> {
    const latest = await this.verificationCodeRepository.findLatestLive(
      user.id,
      purpose,
    );

    const isLive =
      latest !== null &&
      !latest.consumedAt &&
      now.getTime() < latest.expiresAt.getTime() &&
      now.getTime() - latest.createdAt.getTime() < COOLDOWN_MS;

    if (isLive && latest) {
      return {
        codeSent: true,
        resendAvailableAt: new Date(latest.createdAt.getTime() + COOLDOWN_MS),
      };
    }

    return this.issue(user, purpose, now);
  }

  @Transactional({ connectionName: 'identity' })
  async issue(
    user: IdentityUser,
    purpose: CodeSenderPurpose,
    now: Date,
  ): Promise<IssueCodeResult> {
    const latest = await this.verificationCodeRepository.findLatestLive(
      user.id,
      purpose,
    );
    const resendAvailableAt = new Date(now.getTime() + COOLDOWN_MS);

    if (latest && now.getTime() - latest.createdAt.getTime() < COOLDOWN_MS) {
      throw new IdentityException(
        'RESEND_TOO_SOON',
        'Please wait before requesting another code.',
      );
    }

    await this.verificationCodeRepository.invalidateLive(user.id, purpose, now);

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    const savedRow = await this.verificationCodeRepository.save(
      new IdentityVerificationCode({
        userId: user.id,
        purpose,
        codeHash,
        createdAt: now,
        expiresAt: new Date(now.getTime() + EXPIRY_MS),
        failedAttempts: 0,
      }),
    );

    let codeSent = true;
    try {
      await this.codeSender.send({ email: user.email, purpose, code });
    } catch (error) {
      codeSent = false;
      // Nothing was actually delivered, so this row must not behave like a
      // live code: it must not block the next resend attempt with
      // RESEND_TOO_SOON, and `issueOrReuse` must not reuse it and report
      // codeSent: true for a code nobody received. Going through `save`
      // (rather than a raw query on `invalidateLive`) matters here: that
      // query runs on its own connection and can't see this row, which was
      // inserted earlier in this same still-open transaction.
      savedRow.invalidatedAt = now;
      await this.verificationCodeRepository.save(savedRow);
      this.logger.error("Couldn't send verification code", {
        exception: error,
        userId: user.id,
        purpose,
      });
    }

    return { codeSent, resendAvailableAt };
  }

  @Transactional({ connectionName: 'identity' })
  async consume(
    user: IdentityUser,
    purpose: CodeSenderPurpose,
    code: string,
    now: Date,
  ): Promise<void> {
    const latest = await this.verificationCodeRepository.findLatestLive(
      user.id,
      purpose,
    );

    if (!latest || latest.consumedAt) {
      throw new IdentityException(
        'CODE_INCORRECT',
        'Incorrect code. Please try again.',
      );
    }

    if (latest.failedAttempts >= MAX_ATTEMPTS) {
      throw new IdentityException(
        'CODE_ATTEMPTS_EXCEEDED',
        'Too many incorrect attempts. Request a new code.',
      );
    }

    if (now.getTime() > latest.expiresAt.getTime()) {
      throw new IdentityException(
        'CODE_EXPIRED',
        'This code has expired. Request a new one.',
      );
    }

    const matches = await bcrypt.compare(code, latest.codeHash);
    if (!matches) {
      await this.verificationCodeRepository.incrementFailedAttempts(latest.id);
      throw new IdentityException(
        'CODE_INCORRECT',
        'Incorrect code. Please try again.',
      );
    }

    const consumed = await this.verificationCodeRepository.markConsumed(
      latest.id,
      now,
    );
    if (!consumed) {
      throw new IdentityException(
        'CODE_INCORRECT',
        'Incorrect code. Please try again.',
      );
    }
  }

  private generateCode(): string {
    return randomInt(0, 10 ** CODE_LENGTH)
      .toString()
      .padStart(CODE_LENGTH, '0');
  }
}
