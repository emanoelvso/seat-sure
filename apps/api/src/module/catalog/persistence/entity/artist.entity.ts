import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { EventArtist } from './event-artist.entity';

@Entity('Artist')
export class Artist extends DefaultEntity<Artist> {
  @Column({ type: 'varchar', length: 20, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  stage_name: string;

  @Column({ type: 'varchar', length: 200 })
  bio: string;

  @Column('varchar')
  cover_image_url: string;

  @Column('simple-array')
  genres: string[];

  @OneToMany(() => EventArtist, (ea) => ea.artist)
  eventArtists: EventArtist[];
}
