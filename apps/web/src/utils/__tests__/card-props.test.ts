import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventSummary } from "@/types/api";
import { toCardProps } from "@/utils/card-props";

// 01:00 UTC on Nov 7 is still 10:00 PM on Nov 6 in São Paulo (UTC-3).
const event: EventSummary = {
  id: "e1",
  name: "Adele",
  coverImage: "/artist/adele.png",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  date: "2026-11-07T01:00:00.000Z",
  startAt: "2026-11-07T01:00:00.000Z",
  price: 449.99,
  category: "Pop",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("toCardProps", () => {
  it("formats the card date in America/Sao_Paulo", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "America/Sao_Paulo");

    expect(toCardProps([event])[0].date).toBe("Nov 6, 2026");
  });

  it("formats the card date in UTC", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");

    expect(toCardProps([event])[0].date).toBe("Nov 7, 2026");
  });

  it("maps the name, the city as location, the price and the category", () => {
    vi.stubEnv("NEXT_PUBLIC_TIME_ZONE", "UTC");

    expect(toCardProps([event])).toEqual([
      {
        avatarUrl: "/artist/adele.png",
        name: "Adele",
        date: "Nov 7, 2026",
        location: "Las Vegas",
        price: 449.99,
        category: "Pop",
        href: "/events/e1/tickets",
      },
    ]);
  });

  it("links each card to its own event's tickets page", () => {
    const coldplay: EventSummary = { ...event, id: "e2", name: "Coldplay" };

    expect(toCardProps([event, coldplay]).map((card) => card.href)).toEqual([
      "/events/e1/tickets",
      "/events/e2/tickets",
    ]);
  });
});
