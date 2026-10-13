import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
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

// A seat map is one venue's layout. (id, venueId) is unique so an event can
// reference its map together with its own venue (see Event.seatMap).
@Entity('CatalogSeatMap')
@Unique(['id', 'venueId'])
export class SeatMap extends DefaultEntity<SeatMap> {
  @Column({ type: 'uuid' })
  venueId: string;

  @ManyToOne(() => Venue, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  layout: SeatMapLayout;
}
