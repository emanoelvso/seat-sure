import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('IdentityPasswordResetGrant')
@Unique(['tokenHash'])
export class IdentityPasswordResetGrant extends DefaultEntity<IdentityPasswordResetGrant> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date | null;
}
