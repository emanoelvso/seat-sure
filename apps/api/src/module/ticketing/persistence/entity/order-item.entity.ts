import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

// One seat of an order. The seat is a plain Catalog id; row, number and the
// amounts are snapshots taken when the checkout starts (PAY-07).
@Entity('TicketingOrderItem')
@Check(`"unitPriceCents" >= 0`)
@Check(`"serviceFeeCents" >= 0`)
@Check(`"taxCents" >= 0`)
export class OrderItem extends DefaultEntity<OrderItem> {
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  seatId: string;

  @Column({ type: 'varchar', length: 10 })
  seatRow: string;

  @Column({ type: 'varchar', length: 10 })
  seatNumber: string;

  @Column({ type: 'integer' })
  unitPriceCents: number;

  @Column({ type: 'integer' })
  serviceFeeCents: number;

  @Column({ type: 'integer' })
  taxCents: number;
}
