import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Event } from './event.entity';
import { Artist } from './artist.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';

@Entity('CatalogEventArtist')
export class EventArtist extends DefaultEntity<EventArtist> {
  @ManyToOne(() => Event, (event) => event.eventArtists, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => Artist, (artist) => artist.eventArtists, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @Column({ type: 'boolean', default: false })
  headliner: boolean;

  @Column({ type: 'int', nullable: true })
  performance_order?: number;
}
