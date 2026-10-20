import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

// One row per requested account deletion, kept after it completes. It holds
// no personal data, only the user id, so it can't be traced back to a person.
// `createdAt` is the time the deletion was requested.
@Entity('IdentityAccountDeletion')
export class IdentityAccountDeletion extends DefaultEntity<IdentityAccountDeletion> {
  @Column({ type: 'uuid', unique: true })
  userId: string;

  // Null while any module's erasure is still pending
  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
