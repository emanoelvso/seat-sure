import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'Event' })
export class Event extends DefaultEntity<Event> {
  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  venue: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ type: 'timestamp' })
  doors_open: Date;

  @Column({ type: 'enum', enum: EventStatus })
  status: EventStatus;

  @Column()
  category: string;
}
