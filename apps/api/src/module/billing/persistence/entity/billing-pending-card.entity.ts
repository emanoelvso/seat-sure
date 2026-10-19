import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

// A card the buyer asked to save, held until its payment is captured. Same
// secrecy rules as BillingPaymentCard (AD-026). The payment and the user are
// plain ids, with no foreign key.
@Entity('BillingPendingCard')
export class BillingPendingCard extends DefaultEntity<BillingPendingCard> {
  @Column({ type: 'uuid', unique: true })
  paymentId: string;

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
}
