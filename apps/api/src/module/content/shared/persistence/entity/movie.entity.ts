import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Thumbnail } from './thumbnail.entity';
import { Video } from './video.entity';
import { Content } from './content.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';

@Entity('Movie')
export class Movie extends DefaultEntity<Movie> {
  @OneToOne(() => Thumbnail, { cascade: true })
  @JoinColumn()
  thumbnail: Thumbnail | null;

  @OneToOne(() => Content, (content) => content.movie)
  @JoinColumn()
  content: Content;

  @Column({ type: 'uuid', nullable: false })
  contentId: string;

  @OneToOne(() => Video, (video) => video.movie, {
    cascade: true,
  })
  video: Video;

  @Column({ type: 'float', nullable: true })
  externalRating?: number;
}
