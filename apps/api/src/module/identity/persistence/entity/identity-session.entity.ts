import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('IdentitySession')
@Unique(['refreshTokenHash'])
export class IdentitySession extends DefaultEntity<IdentitySession> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'char', length: 64 })
  refreshTokenHash: string;

  @Column({ type: 'char', length: 64, nullable: true })
  previousRefreshTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rotatedAt?: Date | null;

  @Column({ type: 'boolean' })
  persistent: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;
}
