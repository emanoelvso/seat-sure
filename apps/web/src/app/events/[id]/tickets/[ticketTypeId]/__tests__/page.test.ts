import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { getEventSeats } from "@/features/tickets/api/get-event-seats";
import { EventSeatsView } from "@/features/tickets/components/event-seats-view";
import EventSeatsPage from "@/app/events/[id]/tickets/[ticketTypeId]/page";

const { NOT_FOUND } = vi.hoisted(() => ({ NOT_FOUND: new Error("NEXT_NOT_FOUND") }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND;
  }),
}));
vi.mock("@/features/tickets/api/get-event-seats", () => ({
  getEventSeats: vi.fn(),
}));
// Their headers load next/font, which only runs in a Next.js build. The page
// is only checked for the elements it returns, so neither renders.
vi.mock("@/features/tickets/components/event-seats-view", () => ({
  EventSeatsView: vi.fn(),
}));
vi.mock("@/components/layouts/footer", () => ({ Footer: vi.fn() }));

type EventSeats = Awaited<ReturnType<typeof getEventSeats>>;

const mockedGetEventSeats = vi.mocked(getEventSeats);

const params = (id: string, ticketTypeId: string) => ({
  params: Promise.resolve({ id, ticketTypeId }),
});

// The first element of `type` in a React element tree.
function findElement(node: ReactNode, type: unknown): ReactElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;

  return findElement((node.props as { children?: ReactNode }).children, type);
}

describe("EventSeatsPage", () => {
  beforeEach(() => {
    mockedGetEventSeats.mockReset();
    vi.mocked(notFound).mockClear();
  });

  it("answers not found when the API returns no event", async () => {
    mockedGetEventSeats.mockResolvedValue({
      ticketTypeSeats: { event: null, ticketType: null, seatMap: null, seats: [] },
      unavailableSeatIds: [],
    } as unknown as EventSeats);

    await expect(
      EventSeatsPage(params("event-1", "ticket-type-of-another-event")),
    ).rejects.toBe(NOT_FOUND);

    expect(mockedGetEventSeats).toHaveBeenCalledWith(
      "event-1",
      "ticket-type-of-another-event",
    );
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the seat view with the loader's seats and unavailable ids", async () => {
    const ticketTypeSeats = {
      event: { id: "event-2", name: "Adele" },
      ticketType: { id: "ticket-type-2", name: "VIP" },
      seatMap: { id: "seat-map-1" },
      seats: [{ id: "seat-1", row: "7", number: "05", x: 283, y: 369 }],
    };
    mockedGetEventSeats.mockResolvedValue({
      ticketTypeSeats,
      unavailableSeatIds: ["seat-2", "seat-3"],
    } as unknown as EventSeats);

    const page = await EventSeatsPage(params("event-2", "ticket-type-2"));

    expect(mockedGetEventSeats).toHaveBeenCalledWith("event-2", "ticket-type-2");
    expect(notFound).not.toHaveBeenCalled();
    expect(findElement(page, EventSeatsView)?.props).toEqual({
      ticketTypeSeats,
      unavailableSeatIds: ["seat-2", "seat-3"],
    });
  });
});
