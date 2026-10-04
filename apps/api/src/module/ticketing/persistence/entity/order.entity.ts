import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity, Index, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

// User, event, ticket type and payment are plain ids of other modules, with no
// foreign key. The event and ticket type fields are snapshots taken when the
// checkout starts (PAY-07), so checkout pages never read Catalog again.
@Entity('TicketingOrder')
@Index(['userId', 'eventId', 'status'])
@Check(`"subtotalCents" >= 0`)
@Check(`"serviceFeeCents" >= 0`)
@Check(`"taxCents" >= 0`)
@Check(`"totalCents" >= 0`)
export class Order extends DefaultEntity<Order> {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 100 })
  eventName: string;

  @Column({ type: 'timestamptz' })
  eventStartAt: Date;

  @Column({ type: 'varchar' })
  eventCoverImage: string;

  @Column({ type: 'varchar', length: 100 })
  eventVenue: string;

  @Column({ type: 'varchar', length: 100 })
  eventCity: string;

  @Column({ type: 'varchar', length: 15 })
  eventCountry: string;

  @Column({ type: 'uuid' })
  ticketTypeId: string;

  @Column({ type: 'varchar', length: 100 })
  ticketTypeName: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'integer' })
  subtotalCents: number;

  @Column({ type: 'integer' })
  serviceFeeCents: number;

  @Column({ type: 'integer' })
  taxCents: number;

  @Column({ type: 'integer' })
  totalCents: number;

  // Equal to the expiry of the order's holds
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];
}
