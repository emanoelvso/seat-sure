import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Thumbnail } from './thumbnail.entity';
import { Episode } from './episode.entity';
import { Content } from './content.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';

@Entity('TvShow')
export class TvShow extends DefaultEntity<TvShow> {
  @OneToOne(() => Thumbnail, { cascade: true })
  @JoinColumn()
  thumbnail: Thumbnail;

  @OneToOne(() => Content, (content) => content.tvShow)
  @JoinColumn()
  content: Content;

  @Column({ type: 'uuid', nullable: false })
  contentId: string;

  @OneToMany(() => Episode, (episode) => episode.tvShow)
  episode: Episode;
}
