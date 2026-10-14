import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TicketType } from './ticket-type.entity';

// A row's price is its ticket type's base priceCents plus this premium, so a
// row can never cost less than the base. Rows without an entry cost the base.
@Entity('CatalogTicketTypeRowPrice')
@Unique(['ticketType', 'row'])
@Check(`btrim("row") <> ''`)
@Check(`"premiumCents" >= 0`)
export class TicketTypeRowPrice extends DefaultEntity<TicketTypeRowPrice> {
  @ManyToOne(() => TicketType, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  // Matches Seat.row
  @Column({ type: 'varchar', length: 10 })
  row: string;

  @Column({ type: 'integer' })
  premiumCents: number;
}
