import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

// Failed card attempts of one user (AD-028). The user is a plain id of
// another module, with no foreign key.
@Entity('BillingCardThrottle')
@Unique(['userId'])
export class BillingCardThrottle extends DefaultEntity<BillingCardThrottle> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamptz' })
  windowStartedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;
}
