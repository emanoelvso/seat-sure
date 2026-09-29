import { graphqlServerFetch } from "@/lib/graphql-server";
import {
  FIND_EVENT_TICKETS,
  FindEventTicketsData,
} from "@/features/tickets/api/find-event-tickets";

export async function getEventTickets(eventId: string) {
  const data = await graphqlServerFetch<
    FindEventTicketsData,
    { input: { eventId: string } }
  >(FIND_EVENT_TICKETS, { input: { eventId } }, { tags: [`event:${eventId}`] });

  return data.findEventTickets;
}
