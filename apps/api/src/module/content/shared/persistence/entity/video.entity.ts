import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Movie } from './movie.entity';
import { Episode } from './episode.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { VideoMetadata } from './video-metadata.entity';

@Entity('Video')
export class Video extends DefaultEntity<Video> {
  @Column({ type: 'varchar', nullable: false })
  url: string;

  @Column('int')
  sizeInKb: number;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @OneToOne(() => Movie, (movie) => movie.video)
  @JoinColumn()
  movie: Movie;

  @Column({ type: 'uuid', nullable: true })
  movieId: string | null;

  @OneToOne(() => Episode, (episode) => episode.video)
  @JoinColumn()
  episode: Episode;

  @OneToOne(() => VideoMetadata, (metadata) => metadata.video, {
    cascade: true,
  })
  metadata: VideoMetadata;
}
