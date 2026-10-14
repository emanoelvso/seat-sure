import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { SeatMap } from './seat-map.entity';

// How good the view is from one section of a seat map. A venue fact, so it
// belongs to the seat map and not to an event.
@Entity('CatalogSeatMapSectionView')
@Unique(['seatMap', 'sectionKey'])
@Check(`"score" >= 0 AND "score" <= 5`)
@Check(`btrim("label") <> ''`)
export class SeatMapSectionView extends DefaultEntity<SeatMapSectionView> {
  @ManyToOne(() => SeatMap, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seatMapId' })
  seatMap: SeatMap;

  // Matches SeatMap.layout.sections[].key
  @Column({ type: 'varchar', length: 50 })
  sectionKey: string;

  // 0.0 to 5.0; pg returns numeric as a string
  @Column({
    type: 'numeric',
    precision: 2,
    scale: 1,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  score: number;

  // Short description of the view, e.g. "Clear View"
  @Column({ type: 'varchar', length: 30 })
  label: string;
}
