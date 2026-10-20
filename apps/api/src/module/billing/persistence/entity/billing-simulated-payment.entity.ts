import { SimulatedPaymentStatus } from '@billingModule/core/enum/simulated-payment-status.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

// State of the simulated gateway, kept durable so idempotency keys and 3-D
// Secure challenges survive restarts and several instances.
@Entity('BillingSimulatedPayment')
export class BillingSimulatedPayment extends DefaultEntity<BillingSimulatedPayment> {
  @Column({ type: 'varchar', length: 120, unique: true })
  idempotencyKey: string;

  @Column({ type: 'enum', enum: SimulatedPaymentStatus })
  status: SimulatedPaymentStatus;

  @Column({ type: 'varchar', unique: true, nullable: true })
  clientSecret: string | null;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'char', length: 3 })
  currency: string;
}
