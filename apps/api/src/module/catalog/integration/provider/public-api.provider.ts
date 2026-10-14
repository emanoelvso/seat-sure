import { Injectable } from '@nestjs/common';
import {
  CatalogApi,
  CheckoutSelection,
  FindCheckoutSelectionInput,
} from '@sharedModules/integration/interface/catalog-integration.interface';
import { CatalogService } from '@catalogModule/core/service/catalog.service';

@Injectable()
export class CatalogPublicApiProvider implements CatalogApi {
  constructor(private readonly catalogService: CatalogService) {}

  async findCheckoutSelection({
    eventId,
    ticketTypeId,
    seatIds,
    now = new Date(),
  }: FindCheckoutSelectionInput): Promise<CheckoutSelection | null> {
    const { event, ticketType, seats } =
      await this.catalogService.findTicketTypeSeats({
        eventId,
        ticketTypeId,
        now,
      });

    if (!event || !ticketType) {
      return null;
    }

    const seatById = new Map(seats.map((seat) => [seat.id, seat]));
    const selectedSeats = seatIds.map((seatId) => seatById.get(seatId));

    if (selectedSeats.some((seat) => !seat)) {
      return null;
    }

    return {
      event: {
        id: event.id,
        name: event.name,
        startAt: event.startAt,
        coverImage: event.coverImage,
        venue: event.venue,
        city: event.city,
        country: event.country,
      },
      ticketType: {
        id: ticketType.id,
        name: ticketType.name,
        priceCents: ticketType.priceCents,
        serviceFeeCents: ticketType.serviceFeeCents,
        taxCents: ticketType.taxCents,
        currency: ticketType.currency,
        maxPerOrder: ticketType.maxPerOrder,
      },
      seats: selectedSeats.map((seat) => ({
        id: seat!.id,
        row: seat!.row,
        number: seat!.number,
        priceCents: seat!.priceCents,
      })),
    };
  }
}
