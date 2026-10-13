import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BillingCardThrottle } from '@billingModule/persistence/entity/billing-card-throttle.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';

const WINDOW_INTERVAL = '15 minutes';

@Injectable()
export class CardThrottleRepository extends DefaultTypeOrmRepository<BillingCardThrottle> {
  constructor(
    @InjectDataSource('billing')
    readonly datasource: DataSource,
  ) {
    super(BillingCardThrottle, datasource.manager);
  }

  async findByUserId(userId: string): Promise<BillingCardThrottle | null> {
    return this.findOne({ where: { userId } });
  }

  // One INSERT ... ON CONFLICT DO UPDATE, so concurrent failures are all
  // counted. All timing runs against the caller's `now` (never SQL now()): a
  // failure outside the 15-minute window restarts the count at 1; the 5th
  // failure inside the window locks for 15 minutes and resets the count.
  async recordFailure(userId: string, now: Date): Promise<void> {
    await this.entityManager.query(
      `
      INSERT INTO "BillingCardThrottle"
        ("id", "userId", "failedCount", "windowStartedAt", "lockedUntil", "createdAt", "updatedAt")
      VALUES ($1, $2, 1, $3::timestamptz, NULL, $3::timestamptz, $3::timestamptz)
      ON CONFLICT ("userId") DO UPDATE SET
        "failedCount" = CASE
          WHEN "BillingCardThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN 1
          WHEN "BillingCardThrottle"."failedCount" + 1 >= 5 THEN 0
          ELSE "BillingCardThrottle"."failedCount" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "BillingCardThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN $3::timestamptz
          ELSE "BillingCardThrottle"."windowStartedAt"
        END,
        "lockedUntil" = CASE
          WHEN "BillingCardThrottle"."windowStartedAt" < ($3::timestamptz - interval '${WINDOW_INTERVAL}') THEN NULL
          WHEN "BillingCardThrottle"."failedCount" + 1 >= 5 THEN ($3::timestamptz + interval '${WINDOW_INTERVAL}')
          ELSE "BillingCardThrottle"."lockedUntil"
        END,
        "updatedAt" = $3::timestamptz
      `,
      [randomUUID(), userId, now],
    );
  }

  async clear(userId: string): Promise<void> {
    await this.entityManager.query(
      `DELETE FROM "BillingCardThrottle" WHERE "userId" = $1`,
      [userId],
    );
  }
}
