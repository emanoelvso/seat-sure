import { print } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlServerFetch } from "@/lib/graphql-server";
import { getEventSeats } from "@/features/tickets/api/get-event-seats";
import { FIND_TICKET_TYPE_SEATS } from "@/features/tickets/api/find-ticket-type-seats";
import { FIND_UNAVAILABLE_SEATS } from "@/features/tickets/api/find-unavailable-seats";
import { FIND_EVENT_TICKETS } from "@/features/tickets/api/find-event-tickets";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graphql-server");

const mockedFetch = vi.mocked(graphqlServerFetch);

// Answers each query by its document, so the tests don't depend on the order
// of the two calls.
function answer({
  ticketTypeSeats,
  seatIds,
}: {
  ticketTypeSeats: Promise<unknown>;
  seatIds: Promise<string[]>;
}) {
  mockedFetch.mockImplementation(((document: unknown) =>
    document === FIND_TICKET_TYPE_SEATS
      ? ticketTypeSeats.then((value) => ({ findTicketTypeSeats: value }))
      : seatIds.then((ids) => ({
          findUnavailableSeats: { seatIds: ids },
        }))) as typeof graphqlServerFetch);
}

function optionsOf(document: unknown) {
  return mockedFetch.mock.calls.find(([called]) => called === document)?.[2];
}

const firstSeats = {
  event: { id: "event-1", name: "Concert One" },
  ticketType: { id: "ticket-type-1", priceCents: 45000, maxPriceCents: 60000 },
  seats: [
    {
      id: "seat-a1",
      row: "4",
      number: "09",
      x: 175,
      y: 40,
      priceCents: 60000,
      perks: ["AISLE", "ACCESSIBLE"],
    },
  ],
  sectionView: { score: 4.7, label: "Clear View" },
};
const secondSeats = {
  event: { id: "event-2", name: "Concert Two" },
  ticketType: { id: "ticket-type-2", priceCents: 30000, maxPriceCents: 30000 },
  seats: [
    {
      id: "seat-b1",
      row: "7",
      number: "05",
      x: 283,
      y: 369,
      priceCents: 30000,
      perks: [],
    },
  ],
  sectionView: null,
};

// The query text with its whitespace collapsed, to assert the selected fields.
const queryText = (document: Parameters<typeof print>[0]) =>
  print(document).replace(/\s+/g, " ");

describe("getEventSeats", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("sends the first event and ticket type ids and returns their own seats and unavailable ids", async () => {
    answer({
      ticketTypeSeats: Promise.resolve(firstSeats),
      seatIds: Promise.resolve(["seat-a2", "seat-a3"]),
    });

    const result = await getEventSeats("event-1", "ticket-type-1");

    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_TICKET_TYPE_SEATS,
      { input: { eventId: "event-1", ticketTypeId: "ticket-type-1" } },
      expect.anything(),
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_UNAVAILABLE_SEATS,
      { input: { eventId: "event-1" } },
      expect.anything(),
    );
    expect(result).toEqual({
      ticketTypeSeats: firstSeats,
      unavailableSeatIds: ["seat-a2", "seat-a3"],
    });
  });

  it("sends a different pair of ids and returns that pair's own results (L-001)", async () => {
    answer({
      ticketTypeSeats: Promise.resolve(secondSeats),
      seatIds: Promise.resolve(["seat-b2"]),
    });

    const result = await getEventSeats("event-2", "ticket-type-2");

    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_TICKET_TYPE_SEATS,
      { input: { eventId: "event-2", ticketTypeId: "ticket-type-2" } },
      expect.anything(),
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      FIND_UNAVAILABLE_SEATS,
      { input: { eventId: "event-2" } },
      expect.anything(),
    );
    expect(result).toEqual({
      ticketTypeSeats: secondSeats,
      unavailableSeatIds: ["seat-b2"],
    });
  });

  // SEAT-34: availability is never served from the data cache. Seats keep
  // the default revalidate, tagged by the event.
  it("fetches availability with revalidate 0 and the seats with the event tag only (SEAT-34)", async () => {
    answer({
      ticketTypeSeats: Promise.resolve(secondSeats),
      seatIds: Promise.resolve(["seat-b2"]),
    });

    await getEventSeats("event-2", "ticket-type-2");

    expect(optionsOf(FIND_UNAVAILABLE_SEATS)).toEqual({ revalidate: 0 });
    // An exact match, so a `revalidate: 0` on the seats call fails here.
    expect(optionsOf(FIND_TICKET_TYPE_SEATS)).toEqual({
      tags: ["event:event-2"],
    });
  });

  it("rejects with the error of a failed findTicketTypeSeats (SEAT-33)", async () => {
    const error = new Error("seats failed");
    answer({
      ticketTypeSeats: Promise.reject(error),
      seatIds: Promise.resolve(["seat-a2"]),
    });

    await expect(getEventSeats("event-1", "ticket-type-1")).rejects.toBe(error);
  });

  it("rejects with the error of a failed findUnavailableSeats (SEAT-33)", async () => {
    const error = new Error("availability failed");
    answer({
      ticketTypeSeats: Promise.resolve(firstSeats),
      seatIds: Promise.reject(error),
    });

    await expect(getEventSeats("event-1", "ticket-type-1")).rejects.toBe(error);
  });

  it("passes each seat's price and perks and the section view rating through (PRICE-01, PERK-01, VIEW-01)", async () => {
    answer({
      ticketTypeSeats: Promise.resolve(firstSeats),
      seatIds: Promise.resolve([]),
    });

    const { ticketTypeSeats } = await getEventSeats("event-1", "ticket-type-1");

    expect(ticketTypeSeats.seats).toEqual(firstSeats.seats);
    expect(ticketTypeSeats.sectionView).toEqual({
      score: 4.7,
      label: "Clear View",
    });
  });

  it("selects the seat price and perks, the section view and the ticket type's highest price (PRICE-01, PERK-01, VIEW-01, PRICE-10)", () => {
    const seatsQuery = queryText(FIND_TICKET_TYPE_SEATS);

    expect(seatsQuery).toContain(
      "seats { id row number x y priceCents perks }",
    );
    expect(seatsQuery).toContain("sectionView { score label }");
    expect(seatsQuery).toMatch(/ticketType \{[^}]*\bmaxPriceCents\b/);
    expect(queryText(FIND_EVENT_TICKETS)).toMatch(
      /ticketTypes \{[^}]*\bmaxPriceCents\b/,
    );
  });
});
