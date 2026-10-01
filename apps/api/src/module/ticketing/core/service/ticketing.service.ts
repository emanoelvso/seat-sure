import { Injectable } from '@nestjs/common';
import { UnavailableSeatsModel } from '@ticketingModule/core/model/unavailable-seats.model';
import { SeatHoldRepository } from '@ticketingModule/persistence/repository/seat-hold.repository';
import { TicketRepository } from '@ticketingModule/persistence/repository/ticket.repository';
import { isUUID } from 'class-validator';

@Injectable()
export class TicketingService {
  constructor(
    private readonly seatHoldRepository: SeatHoldRepository,
    private readonly ticketRepository: TicketRepository,
  ) {}

  // Seats held or sold for the event. Catalog's seats are combined with this
  // list by the client (ADR-015, AD-015).
  async findUnavailableSeats({
    eventId,
    now = new Date(),
  }: {
    eventId: string;
    now?: Date;
  }): Promise<UnavailableSeatsModel> {
    if (!isUUID(eventId)) {
      return { seatIds: [] };
    }

    const [heldSeatIds, soldSeatIds] = await Promise.all([
      this.seatHoldRepository.findActiveSeatIds(eventId, now),
      this.ticketRepository.findSoldSeatIds(eventId),
    ]);

    return { seatIds: [...new Set([...heldSeatIds, ...soldSeatIds])] };
  }
}
