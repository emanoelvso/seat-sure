import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

// A saved card (AD-026): the gateway token and display data only. The card
// number and CVV are never stored. The token and the fingerprint never leave
// Billing. The user is a plain id of another module, with no foreign key.
@Entity('BillingPaymentCard')
@Unique(['userId', 'fingerprint'])
@Index(['userId'], { unique: true, where: '"isDefault"' })
export class BillingPaymentCard extends DefaultEntity<BillingPaymentCard> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar' })
  providerToken: string;

  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'char', length: 64 })
  fingerprint: string;

  @Column({ type: 'varchar', length: 20 })
  brand: string;

  @Column({ type: 'char', length: 4 })
  last4: string;

  @Column({ type: 'smallint' })
  expMonth: number;

  @Column({ type: 'smallint' })
  expYear: number;

  @Column({ type: 'varchar', length: 50 })
  holder: string;

  @Column({ type: 'boolean' })
  isDefault: boolean;
}
