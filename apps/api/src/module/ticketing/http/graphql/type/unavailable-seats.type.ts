import { Field, ObjectType } from '@nestjs/graphql';
import { UnavailableSeatsModel } from '@ticketingModule/core/model/unavailable-seats.model';

// Seat ids only: never who holds or bought a seat (SEAT-10).
@ObjectType()
export class UnavailableSeats implements UnavailableSeatsModel {
  @Field(() => [String])
  seatIds: string[];
}
