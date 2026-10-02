import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

// The profile row for an Identity user (ADR not shared: id is always supplied
// by the caller as the Identity user's id; no FK across modules).
@Entity('UserProfileUser')
export class UserProfileUser extends DefaultEntity<UserProfileUser> {
  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string | null;
}
