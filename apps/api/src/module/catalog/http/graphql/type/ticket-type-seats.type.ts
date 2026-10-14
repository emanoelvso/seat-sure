import {
  SeatMap,
  TicketType,
} from '@catalogModule/http/graphql/type/event-tickets.type';
import { Event } from '@catalogModule/http/graphql/type/events.type';
import {
  SeatModel,
  TicketTypeSeatsModel,
} from '@catalogModule/core/model/seat.model';
import { SeatPerk } from '@catalogModule/core/enum/seat-perk.enum';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

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

  @Field(() => Int)
  priceCents: number;

  @Field(() => [SeatPerk])
  perks: SeatPerk[];
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
