import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('IdentityLoginThrottle')
@Unique(['email'])
export class IdentityLoginThrottle extends DefaultEntity<IdentityLoginThrottle> {
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamptz' })
  windowStartedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;
}
