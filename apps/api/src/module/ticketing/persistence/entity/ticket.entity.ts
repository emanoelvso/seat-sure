import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Index } from 'typeorm';

// Event, seat and user are plain ids of other modules, with no foreign key.
// Only a live ticket (issued, used, transferred) holds its seat, so a cancelled
// or refunded seat can be sold again (AD-014).
@Entity('TicketingTicket')
@Index(['eventId', 'seatId'], {
  unique: true,
  where: `"status" IN ('issued', 'used', 'transferred')`,
})
export class Ticket extends DefaultEntity<Ticket> {
  @Column({ type: 'uuid' })
  eventId: string;

  // Null for general admission
  @Column({ type: 'uuid', nullable: true })
  seatId: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'enum', enum: TicketStatus })
  status: TicketStatus;
}
