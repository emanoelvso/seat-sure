import { createHash, randomBytes, randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IdentitySession } from '@identityModule/persistence/entity/identity-session.entity';
import { SessionRepository } from '@identityModule/persistence/repository/session.repository';
import { Transactional } from 'typeorm-transactional';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const ROTATION_GRACE_MS = 30 * 1000;

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

  // Rotates the refresh token on every call. The previous token is still
  // honored for a 30s grace window (returning only a fresh access token,
  // `refreshToken: null`) to absorb a client retry racing a prior rotation;
  // anything else (unknown token, past grace, revoked, expired) is
  // unauthenticated.
  @Transactional({ connectionName: 'identity' })
  async rotate(refreshToken: string, now: Date): Promise<SessionTokensResult> {
    const hash = this.hashToken(refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);

    if (session) {
      this.assertUsable(session, now);

      const newRefreshToken = this.generateRefreshToken();
      const newHash = this.hashToken(newRefreshToken);
      await this.sessionRepository.rotate(session.id, {
        refreshTokenHash: newHash,
        previousRefreshTokenHash: hash,
        rotatedAt: now,
      });

      const accessToken = this.signAccessToken(
        session.userId,
        session.id,
        now,
        session.expiresAt,
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expiresAt,
        persistent: session.persistent,
      };
    }

    const staleSession =
      await this.sessionRepository.findByPreviousRefreshTokenHash(hash);
    if (
      staleSession &&
      staleSession.rotatedAt &&
      now.getTime() - staleSession.rotatedAt.getTime() <= ROTATION_GRACE_MS
    ) {
      this.assertUsable(staleSession, now);

      const accessToken = this.signAccessToken(
        staleSession.userId,
        staleSession.id,
        now,
        staleSession.expiresAt,
      );

      return {
        accessToken,
        refreshToken: null,
        expiresAt: staleSession.expiresAt,
        persistent: staleSession.persistent,
      };
    }

    throw new UnauthorizedException();
  }

  @Transactional({ connectionName: 'identity' })
  async revokeAll(userId: string, now: Date): Promise<void> {
    await this.sessionRepository.revokeAllForUser(userId, now);
  }

  async assertActive(sessionId: string, now: Date): Promise<IdentitySession> {
    const session = await this.sessionRepository.findOneById(sessionId);
    if (!session) {
      throw new UnauthorizedException();
    }
    this.assertUsable(session, now);
    return session;
  }

  private assertUsable(session: IdentitySession, now: Date): void {
    if (session.revokedAt || now.getTime() > session.expiresAt.getTime()) {
      throw new UnauthorizedException();
    }
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
