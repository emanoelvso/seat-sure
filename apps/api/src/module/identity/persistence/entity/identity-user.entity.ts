import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

@Entity('IdentityUser')
@Unique(['email'])
export class IdentityUser extends DefaultEntity<IdentityUser> {
  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 60 })
  passwordHash: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;
}
