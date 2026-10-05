import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Event } from './event.entity';

@Entity('CatalogTicketType')
@Unique(['event', 'sectionKey'])
@Check(`"priceCents" >= 0`)
@Check(`"seatsAvailable" >= 0`)
@Check(`"maxPerOrder" >= 1`)
@Check(`"serviceFeeCents" >= 0`)
@Check(`"taxCents" >= 0`)
export class TicketType extends DefaultEntity<TicketType> {
  @ManyToOne(() => Event, (event) => event.ticketTypes, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'varchar', length: 50 })
  sectionKey: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'integer' })
  priceCents: number;

  @Column({ type: 'integer', default: 0 })
  serviceFeeCents: number;

  @Column({ type: 'integer', default: 0 })
  taxCents: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'integer' })
  seatsAvailable: number;

  @Column({ type: 'integer' })
  maxPerOrder: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[] | null;
}
