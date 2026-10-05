import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Index } from 'typeorm';

export type VerificationCodePurpose = 'verify_email' | 'reset_password';

@Entity('IdentityVerificationCode')
@Index(['userId', 'purpose', 'createdAt'])
export class IdentityVerificationCode extends DefaultEntity<IdentityVerificationCode> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  purpose: VerificationCodePurpose;

  @Column({ type: 'varchar', length: 60 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  invalidatedAt?: Date | null;
}
