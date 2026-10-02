import { createHash, randomBytes, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdentitySession } from '@identityModule/persistence/entity/identity-session.entity';
import { SessionRepository } from '@identityModule/persistence/repository/session.repository';
import { Transactional } from 'typeorm-transactional';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface SessionTokensResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  persistent: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService,
  ) {}

  @Transactional({ connectionName: 'identity' })
  async start(
    userId: string,
    persistent: boolean,
    now: Date,
  ): Promise<SessionTokensResult> {
    const sessionId = randomUUID();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(
      now.getTime() + (persistent ? THIRTY_DAYS_MS : TWENTY_FOUR_HOURS_MS),
    );

    await this.sessionRepository.save(
      new IdentitySession({
        id: sessionId,
        userId,
        refreshTokenHash,
        persistent,
        expiresAt,
        createdAt: now,
      }),
    );

    const accessToken = this.signAccessToken(userId, sessionId, now, expiresAt);

    return { accessToken, refreshToken, expiresAt, persistent };
  }

  private signAccessToken(
    userId: string,
    sessionId: string,
    now: Date,
    sessionExpiresAt: Date,
  ): string {
    const cappedExpiryMs = Math.min(
      now.getTime() + ACCESS_TOKEN_TTL_MS,
      sessionExpiresAt.getTime(),
    );

    // No `noTimestamp`: jsonwebtoken only honors a caller-supplied `iat` when
    // that option is absent (with it, `iat` is deleted outright). Supplying
    // `iat` ourselves is what keeps the token's clock on the caller's `now`
    // instead of the library's own `Date.now()`.
    return this.jwtService.sign({
      sub: userId,
      sid: sessionId,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(cappedExpiryMs / 1000),
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
