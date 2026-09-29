import { describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { getEventTickets } from "@/features/tickets/api/get-event-tickets";
import { FIND_EVENT_TICKETS } from "@/features/tickets/api/find-event-tickets";
import type { FindEventTicketsQuery } from "@/types/__generated__/graphql";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");

const mockedFetch = vi.mocked(graphqlServerFetch);

describe("getEventTickets", () => {
  it("sends the given event id as input and returns its own findEventTickets result", async () => {
    mockedFetch.mockResolvedValueOnce({
      findEventTickets: { event: { id: "event-1", name: "Concert One" } },
    } as unknown as FindEventTicketsQuery);

    const result = await getEventTickets("event-1");

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_EVENT_TICKETS,
      { input: { eventId: "event-1" } },
      { tags: ["event:event-1"] },
    );
    expect(result).toEqual({ event: { id: "event-1", name: "Concert One" } });
  });

  it("sends a different event id as input and returns a different findEventTickets result (L-001)", async () => {
    mockedFetch.mockResolvedValueOnce({
      findEventTickets: { event: { id: "event-2", name: "Concert Two" } },
    } as unknown as FindEventTicketsQuery);

    const result = await getEventTickets("event-2");

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_EVENT_TICKETS,
      { input: { eventId: "event-2" } },
      { tags: ["event:event-2"] },
    );
    expect(result).toEqual({ event: { id: "event-2", name: "Concert Two" } });
  });
});
