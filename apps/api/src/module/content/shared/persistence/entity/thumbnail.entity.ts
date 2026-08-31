import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

@Entity('Thumbnail')
export class Thumbnail extends DefaultEntity<Thumbnail> {
  @Column({ type: 'varchar', nullable: false })
  url: string;
}
