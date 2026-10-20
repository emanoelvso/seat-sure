import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { LoginThrottleRepository } from '@identityModule/persistence/repository/login-throttle.repository';
import { PasswordResetGrantRepository } from '@identityModule/persistence/repository/password-reset-grant.repository';
import { SessionRepository } from '@identityModule/persistence/repository/session.repository';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { VerificationCodeRepository } from '@identityModule/persistence/repository/verification-code.repository';
import {
  AccountEraser,
  AccountErasure,
  AccountErasureBlocker,
} from '@sharedModules/integration/interface/account-erasure.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Transactional } from 'typeorm-transactional';

const IDENTITY_STEP = 'identity';

export interface AccountErasureResult {
  failedSteps: string[];
}

// Runs the erasure of one account across modules. Every module that holds
// user data registers an `@AccountErasure()` provider; Identity finds them at
// runtime, so a new module needs no change here. Identity deletes its own rows
// last, so a failed step leaves the deletion pending and retryable.
@Injectable()
export class AccountErasureService {
  private discovered: AccountEraser[] | null = null;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly passwordResetGrantRepository: PasswordResetGrantRepository,
    private readonly loginThrottleRepository: LoginThrottleRepository,
    private readonly accountDeletionRepository: AccountDeletionRepository,
    private readonly logger: AppLogger,
  ) {}

  // The first blocker in eraser-name order; erasers with no check are skipped
  async findBlocker(
    userId: string,
    now: Date,
  ): Promise<AccountErasureBlocker | null> {
    for (const eraser of this.erasers()) {
      const blocker = await eraser.findBlocker?.(userId, now);
      if (blocker) {
        return blocker;
      }
    }
    return null;
  }

  // Every eraser runs even when an earlier one fails. Identity's own rows go
  // only when all succeeded; otherwise the deletion stays pending.
  async erase(userId: string, now: Date): Promise<AccountErasureResult> {
    const failedSteps: string[] = [];

    for (const eraser of this.erasers()) {
      try {
        await eraser.erase(userId);
      } catch (exception) {
        this.logFailure(userId, eraser.name, exception);
        failedSteps.push(eraser.name);
      }
    }

    if (failedSteps.length === 0) {
      try {
        await this.eraseIdentity(userId, now);
      } catch (exception) {
        this.logFailure(userId, IDENTITY_STEP, exception);
        failedSteps.push(IDENTITY_STEP);
      }
    }

    return { failedSteps };
  }

  // One identity transaction: the user row goes last and the deletion is
  // marked completed with it, so a crash can't leave a half-erased identity
  // that looks finished.
  @Transactional({ connectionName: 'identity' })
  async eraseIdentity(userId: string, now: Date): Promise<void> {
    // A user row that is already gone has nothing left to look up
    const user = await this.userRepository.findOne({
      where: { id: userId },
      withDeleted: true,
    });
    await this.sessionRepository.deleteAllForUser(userId);
    await this.verificationCodeRepository.deleteAllForUser(userId);
    await this.passwordResetGrantRepository.deleteAllForUser(userId);
    if (user) {
      await this.loginThrottleRepository.clear(user.email);
    }
    await this.userRepository.hardDeleteById(userId);
    await this.accountDeletionRepository.markCompleted(userId, now);
  }

  private erasers(): AccountEraser[] {
    this.discovered ??= this.discovery
      .getProviders({ metadataKey: AccountErasure.KEY })
      .map((wrapper) => wrapper.instance as AccountEraser | undefined)
      .filter((instance): instance is AccountEraser => !!instance)
      .sort((a, b) => a.name.localeCompare(b.name));
    return this.discovered;
  }

  private logFailure(userId: string, step: string, exception: unknown): void {
    this.logger.error('account-erasure-failed', { userId, step, exception });
  }
}
