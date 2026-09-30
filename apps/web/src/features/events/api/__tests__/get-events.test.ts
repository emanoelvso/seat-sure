import { describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { getEvents } from "@/features/events/api/get-events";
import { FIND_EVENTS } from "@/features/events/api/find-events";
import { toFindEventsInput } from "@/features/events/utils/events-search-params";
import type { FindEventsQuery } from "@/types/__generated__/graphql";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");

const mockedFetch = vi.mocked(graphqlServerFetch);

describe("getEvents", () => {
  it("sends the input built by toFindEventsInput and returns findEvents", async () => {
    const params = {
      type: "SHOW" as const,
      city: "Paris",
      price: "100-300" as const,
      from: "2026-10-01",
      to: "2026-10-05",
      page: 3,
    };
    const findEvents = {
      cities: ["Paris", "Lyon"],
      events: [{ id: "e1" }],
      hasMore: true,
    };
    mockedFetch.mockResolvedValueOnce({
      findEvents,
    } as unknown as FindEventsQuery);

    const result = await getEvents(params);

    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_EVENTS,
      { input: toFindEventsInput(params) },
      { tags: ["events"] },
    );
    expect(toFindEventsInput(params)).toMatchObject({ limit: 60, offset: 0 });
    expect(result).toEqual(findEvents);
  });
});
