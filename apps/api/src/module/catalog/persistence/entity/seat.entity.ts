import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { SeatMap } from './seat-map.entity';

@Entity('CatalogSeat')
@Unique(['seatMap', 'sectionKey', 'row', 'number'])
@Index(['seatMap', 'sectionKey'])
@Check(`btrim("sectionKey") <> ''`)
@Check(`btrim("row") <> ''`)
@Check(`btrim("number") <> ''`)
@Check(`"x" >= 0 AND "y" >= 0`)
export class Seat extends DefaultEntity<Seat> {
  @ManyToOne(() => SeatMap, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatMapId' })
  seatMap: SeatMap;

  // Matches SeatMap.layout.sections[].key
  @Column({ type: 'varchar', length: 50 })
  sectionKey: string;

  // Labels, e.g. row "7" and seat "07"
  @Column({ type: 'varchar', length: 10 })
  row: string;

  @Column({ type: 'varchar', length: 10 })
  number: string;

  // In the section's own seat-chart units, not the venue map's view box
  @Column({ type: 'float' })
  x: number;

  @Column({ type: 'float' })
  y: number;
}
