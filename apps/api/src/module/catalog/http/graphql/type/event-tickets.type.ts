import { Event } from '@catalogModule/http/graphql/type/events.type';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  SeatMapModel,
  SeatMapSectionModel,
  SeatMapSectionShapeModel,
  SeatMapStageModel,
  SeatMapStageShapeModel,
} from '@catalogModule/core/model/seat-map.model';
import { TicketTypeModel } from '@catalogModule/core/model/ticket-type.model';

@ObjectType()
export class SeatMapStageShape implements SeatMapStageShapeModel {
  @Field()
  path: string;

  @Field()
  color: string;
}

@ObjectType()
export class SeatMapStage implements SeatMapStageModel {
  @Field(() => String, { nullable: true })
  label: string | null;

  @Field(() => Float, { nullable: true })
  labelX: number | null;

  @Field(() => Float, { nullable: true })
  labelY: number | null;

  @Field(() => [SeatMapStageShape])
  shapes: SeatMapStageShape[];
}

@ObjectType()
export class SeatMapSectionShape implements SeatMapSectionShapeModel {
  @Field()
  path: string;

  @Field(() => Float)
  labelX: number;

  @Field(() => Float)
  labelY: number;

  @Field(() => Float)
  labelRotation: number;
}

@ObjectType()
export class SeatMapSection implements SeatMapSectionModel {
  @Field()
  key: string;

  @Field()
  label: string;

  @Field()
  color: string;

  @Field(() => [SeatMapSectionShape])
  shapes: SeatMapSectionShape[];
}

@ObjectType()
export class SeatMap implements SeatMapModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  viewBoxWidth: number;

  @Field(() => Float)
  viewBoxHeight: number;

  @Field(() => Float)
  labelSize: number;

  @Field(() => Int)
  labelWeight: number;

  @Field(() => SeatMapStage)
  stage: SeatMapStage;

  @Field(() => [SeatMapSection])
  sections: SeatMapSection[];
}

@ObjectType()
export class TicketType implements TicketTypeModel {
  @Field()
  id: string;

  @Field()
  sectionKey: string;

  @Field()
  name: string;

  @Field(() => Int)
  priceCents: number;

  @Field(() => Int)
  serviceFeeCents: number;

  @Field(() => Int)
  taxCents: number;

  @Field()
  currency: string;

  @Field(() => Int)
  seatsAvailable: number;

  @Field(() => Int)
  maxPerOrder: number;

  @Field(() => [String])
  tags: string[];
}

@ObjectType()
export class EventTickets {
  @Field(() => Event, { nullable: true })
  event: Event | null;

  @Field(() => SeatMap, { nullable: true })
  seatMap: SeatMap | null;

  @Field(() => [TicketType])
  ticketTypes: TicketType[];
}
