import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

@Entity('Venue')
export class Venue extends DefaultEntity<Venue> {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 20 })
  state: string;

  @Column({ type: 'varchar', length: 15 })
  country: string;

  @Column({ type: 'decimal' })
  latitude: number;

  @Column({ type: 'decimal' })
  longitude: number;

  @Column({ type: 'integer' })
  capacity: number;
}
