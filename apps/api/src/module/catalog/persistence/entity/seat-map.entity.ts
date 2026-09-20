import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Venue } from './venue.entity';

export type SeatMapSection = {
  key: string;
  label: string;
  category: string;
  color: string;
  polygon: [number, number][];
  labelAt: [number, number][];
};

export type SeatMapLayout = {
  viewBox: { width: number; height: number };
  stage: { polygon: [number, number][]; label: string };
  sections: SeatMapSection;
};

@Entity({ name: 'SeatMap' })
export class SeatMap {
  @ManyToOne(() => Venue, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  layout: SeatMapLayout;
}
