import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_TICKET_TYPE_SEATS } from "@/features/tickets/api/find-ticket-type-seats";
import { FIND_UNAVAILABLE_SEATS } from "@/features/tickets/api/find-unavailable-seats";

// Seats stay in the data cache. Availability is fetched on every request
// (SEAT-34), which also makes the seat page dynamic. Either failure rejects,
// so no seat is ever drawn without its availability (SEAT-33).
export async function getEventSeats(eventId: string, ticketTypeId: string) {
  const [seatsData, availabilityData] = await Promise.all([
    graphqlServerFetch(
      FIND_TICKET_TYPE_SEATS,
      { input: { eventId, ticketTypeId } },
      { tags: [`event:${eventId}`] },
    ),
    graphqlServerFetch(
      FIND_UNAVAILABLE_SEATS,
      { input: { eventId } },
      { revalidate: 0 },
    ),
  ]);

  return {
    ticketTypeSeats: seatsData.findTicketTypeSeats,
    unavailableSeatIds: availabilityData.findUnavailableSeats.seatIds,
  };
}
