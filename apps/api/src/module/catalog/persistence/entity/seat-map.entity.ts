import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Venue } from './venue.entity';
import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';

export type SeatMapStageShape = { path: string; color: string };

export type SeatMapStage = {
  label: string | null;
  labelAt: [number, number] | null;
  shapes: SeatMapStageShape[];
};

export type SeatMapSectionShape = {
  path: string;
  labelAt: [number, number];
  labelRotation: number;
};

export type SeatMapSection = {
  key: string;
  label: string;
  color: string;
  shapes: SeatMapSectionShape[];
};

export type SeatMapLayout = {
  viewBox: { width: number; height: number };
  labelStyle: { size: number; weight: number };
  stage: SeatMapStage;
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
