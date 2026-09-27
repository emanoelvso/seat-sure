import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Venue } from './venue.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';

export type SeatMapShape = {
  label: string;
  path: string;
  labelAt: [number, number];
};

export type SeatMapSection = SeatMapShape & { key: string; color: string };

export type SeatMapLayout = {
  viewBox: { width: number; height: number };
  stage: SeatMapShape;
  sections: SeatMapSection[];
};

@Entity('SeatMap')
export class SeatMap extends DefaultEntity<SeatMap> {
  @ManyToOne(() => Venue, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  layout: SeatMapLayout;
}
