import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

// The gateway customer of one user, created once per provider. The user is a
// plain id of another module, with no foreign key.
@Entity('BillingCustomer')
@Unique(['userId', 'provider'])
export class BillingCustomer extends DefaultEntity<BillingCustomer> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar' })
  providerCustomerId: string;
}
