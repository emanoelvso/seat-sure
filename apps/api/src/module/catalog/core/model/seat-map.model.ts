export interface SeatMapStageShapeModel {
  path: string;
  color: string;
}

export interface SeatMapStageModel {
  label: string | null;
  labelX: number | null;
  labelY: number | null;
  shapes: SeatMapStageShapeModel[];
}

export interface SeatMapSectionShapeModel {
  path: string;
  labelX: number;
  labelY: number;
  labelRotation: number;
}

export interface SeatMapSectionModel {
  key: string;
  label: string;
  color: string;
  shapes: SeatMapSectionShapeModel[];
}

export interface SeatMapModel {
  id: string;
  name: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  labelSize: number;
  labelWeight: number;
  stage: SeatMapStageModel;
  sections: SeatMapSectionModel[];
}
