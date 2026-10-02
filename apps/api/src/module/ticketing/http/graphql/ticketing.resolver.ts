import { Args, Query, Resolver } from '@nestjs/graphql';
import { TicketingService } from '@ticketingModule/core/service/ticketing.service';
import { FindUnavailableSeatsInput } from './type/find-unavailable-seats-input.type';
import { UnavailableSeats } from './type/unavailable-seats.type';

@Resolver()
export class TicketingResolver {
  constructor(private readonly ticketingService: TicketingService) {}

  @Query(() => UnavailableSeats)
  async findUnavailableSeats(
    @Args('FindUnavailableSeatsInput') { eventId }: FindUnavailableSeatsInput,
  ): Promise<UnavailableSeats> {
    return this.ticketingService.findUnavailableSeats({ eventId });
  }
}
