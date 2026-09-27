import { Event } from '@catalogModule/http/graphql/type/events.type';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SeatMapShape {
  @Field()
  label: string;

  @Field()
  path: string;

  @Field(() => Float)
  labelX: number;

  @Field(() => Float)
  labelY: number;
}

@ObjectType()
export class SeatMapSection extends SeatMapShape {
  @Field()
  key: string;

  @Field()
  color: string;
}

@ObjectType()
export class SeatMap {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  viewBoxWidth: number;

  @Field(() => Float)
  viewBoxHeight: number;

  @Field(() => SeatMapShape)
  stage: SeatMapShape;

  @Field(() => [SeatMapSection])
  sections: SeatMapSection[];
}

@ObjectType()
export class EventTickets {
  @Field(() => Event, { nullable: true })
  event: Event | null;

  @Field(() => SeatMap, { nullable: true })
  seatMap: SeatMap | null;
}
