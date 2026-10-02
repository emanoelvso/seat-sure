import {
  SeatMap,
  TicketType,
} from '@catalogModule/http/graphql/type/event-tickets.type';
import { Event } from '@catalogModule/http/graphql/type/events.type';
import {
  SeatModel,
  TicketTypeSeatsModel,
} from '@catalogModule/core/model/seat.model';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Seat implements SeatModel {
  @Field()
  id: string;

  @Field()
  row: string;

  @Field()
  number: string;

  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;
}

@ObjectType()
export class TicketTypeSeats implements TicketTypeSeatsModel {
  @Field(() => Event, { nullable: true })
  event: Event | null;

  @Field(() => TicketType, { nullable: true })
  ticketType: TicketType | null;

  @Field(() => SeatMap, { nullable: true })
  seatMap: SeatMap | null;

  @Field(() => [Seat])
  seats: Seat[];
}
