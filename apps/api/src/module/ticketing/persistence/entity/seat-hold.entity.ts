import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, Unique } from 'typeorm';

// The seat lock (ADR-015). Event, seat and user are plain ids of other
// modules, with no foreign key.
@Entity('TicketingSeatHold')
@Unique(['eventId', 'seatId'])
export class SeatHold extends DefaultEntity<SeatHold> {
  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  seatId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
