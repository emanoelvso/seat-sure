import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { hasSession } from "@/features/auth/api/session-cookies";
import { startCheckoutAction } from "@/features/checkout/api/start-checkout-action";
import { CheckoutStartView } from "@/features/checkout/components/checkout-start-view";
import { graphqlServerFetch } from "@/lib/graphql-server";
import CheckoutStartPage from "@/app/events/[id]/tickets/[ticketTypeId]/checkout/page";

const { NOT_FOUND, REDIRECT_ERROR } = vi.hoisted(() => ({
  NOT_FOUND: new Error("NEXT_NOT_FOUND"),
  REDIRECT_ERROR: new Error("NEXT_REDIRECT"),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND;
  }),
  redirect: vi.fn(() => {
    throw REDIRECT_ERROR;
  }),
}));
vi.mock("@/features/auth/api/session-cookies", () => ({
  hasSession: vi.fn(),
}));
vi.mock("@/lib/graphql-server", () => ({
  graphqlServerFetch: vi.fn(),
}));
vi.mock("@/features/checkout/api/start-checkout-action", () => ({
  startCheckoutAction: vi.fn(),
}));
// Loads next/font, which only runs in a Next.js build - the page is only
// checked for the elements and props it returns.
vi.mock("@/features/checkout/components/checkout-start-view", () => ({
  CheckoutStartView: vi.fn(),
}));

const mockedHasSession = vi.mocked(hasSession);
const mockedFetch = vi.mocked(graphqlServerFetch);

function routeParams(
  id: string,
  ticketTypeId: string,
  seats?: string,
) {
  return {
    params: Promise.resolve({ id, ticketTypeId }),
    searchParams: Promise.resolve({ seats }),
  };
}

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

const event = {
  id: "event-1",
  name: "Adele",
  coverImage: "/artist/adele.png",
  venue: "Fontainbleau",
  city: "Las Vegas",
  country: "USA",
  startAt: "2026-07-30T19:30:00.000Z",
};

const ticketType = { id: "type-1", name: "VIP", maxPerOrder: 4 };

const seats = [
  { id: "seat-07", row: "7", number: "07" },
  { id: "seat-10", row: "7", number: "10" },
  { id: "seat-05", row: "7", number: "05" },
  { id: "seat-09", row: "7", number: "09" },
];

function mockFindTicketTypeSeats(
  overrides: Partial<{
    event: typeof event | null;
    ticketType: typeof ticketType | null;
    seats: typeof seats;
  }> = {},
) {
  mockedFetch.mockResolvedValue({
    findTicketTypeSeats: {
      event,
      ticketType,
      seats,
      ...overrides,
    },
  } as unknown as Awaited<ReturnType<typeof graphqlServerFetch>>);
}

describe("CheckoutStartPage", () => {
  beforeEach(() => {
    mockedHasSession.mockReset();
    mockedFetch.mockReset();
    vi.mocked(notFound).mockClear();
    vi.mocked(redirect).mockClear();
  });

  it("redirects a signed-out fan to login with the encoded full checkout URL (PAY-03)", async () => {
    mockedHasSession.mockResolvedValue(false);

    await expect(
      CheckoutStartPage(routeParams("event-1", "type-1", "seat-07,seat-10")),
    ).rejects.toBe(REDIRECT_ERROR);

    expect(redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Fevents%2Fevent-1%2Ftickets%2Ftype-1%2Fcheckout%3Fseats%3Dseat-07%2Cseat-10",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("404s when the event is null (PAY-05)", async () => {
    mockedHasSession.mockResolvedValue(true);
    mockFindTicketTypeSeats({ event: null });

    await expect(
      CheckoutStartPage(routeParams("event-1", "type-1", "seat-07")),
    ).rejects.toBe(NOT_FOUND);
  });

  it("404s when seats is empty (PAY-05)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(
      CheckoutStartPage(routeParams("event-1", "type-1", "")),
    ).rejects.toBe(NOT_FOUND);

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("404s on a duplicate seat id (PAY-05)", async () => {
    mockedHasSession.mockResolvedValue(true);

    await expect(
      CheckoutStartPage(routeParams("event-1", "type-1", "seat-07,seat-07")),
    ).rejects.toBe(NOT_FOUND);

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("404s on an unknown seat id (PAY-05)", async () => {
    mockedHasSession.mockResolvedValue(true);
    mockFindTicketTypeSeats();

    await expect(
      CheckoutStartPage(routeParams("event-1", "type-1", "seat-07,unknown-seat")),
    ).rejects.toBe(NOT_FOUND);
  });

  it("404s on more than maxPerOrder ids (PAY-05)", async () => {
    mockedHasSession.mockResolvedValue(true);
    mockFindTicketTypeSeats();

    await expect(
      CheckoutStartPage(
        routeParams(
          "event-1",
          "type-1",
          "seat-07,seat-10,seat-05,seat-09,seat-07-extra",
        ),
      ),
    ).rejects.toBe(NOT_FOUND);
  });

  it("renders the view with the seats in URL order and exactly maxPerOrder ids accepted", async () => {
    mockedHasSession.mockResolvedValue(true);
    mockFindTicketTypeSeats();

    const page = await CheckoutStartPage(
      routeParams("event-1", "type-1", "seat-10,seat-07,seat-09,seat-05"),
    );

    expect(notFound).not.toHaveBeenCalled();
    expect(findElement(page, CheckoutStartView)?.props).toEqual({
      event,
      ticketType,
      seats: [seats[1], seats[0], seats[3], seats[2]],
      startAction: startCheckoutAction,
    });
  });

  it("accepts exactly maxPerOrder ids", async () => {
    mockedHasSession.mockResolvedValue(true);
    mockFindTicketTypeSeats();

    const page = await CheckoutStartPage(
      routeParams("event-1", "type-1", "seat-07,seat-10,seat-05,seat-09"),
    );

    expect(notFound).not.toHaveBeenCalled();
    expect(findElement(page, CheckoutStartView)?.props).toMatchObject({
      seats: [seats[0], seats[1], seats[2], seats[3]],
    });
  });
});
