import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { EventArtist } from './event-artist.entity';

@Entity('Event')
export class Event extends DefaultEntity<Event> {
  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description?: string;

  @Column({ type: 'varchar' })
  coverImage: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'varchar' })
  venue: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ type: 'timestamp' })
  doorsOpen: Date;

  @Column({ type: 'enum', enum: EventStatus })
  status: EventStatus;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'float' })
  price: number;

  @OneToMany(() => EventArtist, (ea) => ea.event)
  eventArtists: EventArtist[];
}
