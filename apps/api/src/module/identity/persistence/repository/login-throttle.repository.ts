import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentityLoginThrottle } from '@identityModule/persistence/entity/identity-login-throttle.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

const WINDOW_INTERVAL = '15 minutes';

@Injectable()
export class LoginThrottleRepository extends DefaultTypeOrmRepository<IdentityLoginThrottle> {
  constructor(
    @InjectDataSource('identity')
    readonly datasource: DataSource,
  ) {
    super(IdentityLoginThrottle, datasource.manager);
  }

  async findByEmail(email: string): Promise<IdentityLoginThrottle | null> {
    return this.findOne({ where: { email } });
  }

  // One INSERT ... ON CONFLICT DO UPDATE, all timing done against the
  // caller's `now` (never SQL now()): a failure outside the 15-minute window
  // restarts the count at 1; the 5th failure inside the window locks for 15
  // minutes and resets the count.
  async recordFailure(email: string, now: Date): Promise<void> {
    await this.entityManager.query(
      `
      INSERT INTO "IdentityLoginThrottle"
        ("id", "email", "failedCount", "windowStartedAt", "lockedUntil", "createdAt", "updatedAt")
      VALUES ($1, $2, 1, $3::timestamptz, NULL, $3::timestamptz, $3::timestamptz)
      ON CONFLICT (email) DO UPDATE SET
        "failedCount" = CASE
          WHEN "IdentityLoginThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN 1
          WHEN "IdentityLoginThrottle"."failedCount" + 1 >= 5 THEN 0
          ELSE "IdentityLoginThrottle"."failedCount" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "IdentityLoginThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN $3::timestamptz
          ELSE "IdentityLoginThrottle"."windowStartedAt"
        END,
        "lockedUntil" = CASE
          WHEN "IdentityLoginThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN NULL
          WHEN "IdentityLoginThrottle"."failedCount" + 1 >= 5 THEN ($3::timestamptz + interval '${WINDOW_INTERVAL}')
          ELSE "IdentityLoginThrottle"."lockedUntil"
        END,
        "updatedAt" = $3::timestamptz
      `,
      [randomUUID(), email, now],
    );
  }

  async clear(email: string): Promise<void> {
    await this.entityManager.query(
      `DELETE FROM "IdentityLoginThrottle" WHERE email = $1`,
      [email],
    );
  }
}
