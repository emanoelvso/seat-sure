import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_EVENTS } from "@/features/events/api/find-events";
import {
  EventsSearchParams,
  toFindEventsInput,
} from "@/features/events/utils/events-search-params";

export async function getEvents(params: EventsSearchParams) {
  const data = await graphqlServerFetch(
    FIND_EVENTS,
    { input: toFindEventsInput(params) },
    { tags: ["events"] },
  );

  return data.findEvents;
}
