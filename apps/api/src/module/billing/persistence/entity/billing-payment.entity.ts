import { PaymentStatus } from '@billingModule/core/enum/payment-status.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity } from 'typeorm';

// User and order are plain ids of other modules, with no foreign key. The
// card number and CVV are never stored (PAY-47): only brand and last 4.
@Entity('BillingPayment')
@Check(`"amountCents" >= 0`)
export class BillingPayment extends DefaultEntity<BillingPayment> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 20 })
  cardBrand: string;

  @Column({ type: 'char', length: 4 })
  cardLast4: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;
}
