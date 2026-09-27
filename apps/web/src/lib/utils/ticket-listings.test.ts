import { describe, expect, it } from "vitest";
import {
  filterListings,
  type GqlTicketType,
  sortListings,
} from "./ticket-listings";

const ticketType = (overrides: Partial<GqlTicketType>): GqlTicketType => ({
  id: overrides.sectionKey ?? "vip",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
  currency: "USD",
  seatsAvailable: 40,
  maxPerOrder: 8,
  tags: [],
  ...overrides,
});

describe("filterListings", () => {
  it("keeps a type whose seatsAvailable exactly equals the quantity (SECT-22)", () => {
    const type = ticketType({ sectionKey: "a", seatsAvailable: 4, maxPerOrder: 8 });

    expect(
      filterListings([type], { quantity: 4, price: { min: 0, max: 1000 } }),
    ).toEqual([type]);
  });

  it("keeps a type whose maxPerOrder exactly equals the quantity (SECT-22)", () => {
    const type = ticketType({ sectionKey: "b", seatsAvailable: 8, maxPerOrder: 4 });

    expect(
      filterListings([type], { quantity: 4, price: { min: 0, max: 1000 } }),
    ).toEqual([type]);
  });

  it("drops a type whose seatsAvailable is one less than the quantity (SECT-22)", () => {
    const type = ticketType({ sectionKey: "c", seatsAvailable: 3, maxPerOrder: 8 });

    expect(
      filterListings([type], { quantity: 4, price: { min: 0, max: 1000 } }),
    ).toEqual([]);
  });

  it("drops a type whose maxPerOrder is one less than the quantity (SECT-22)", () => {
    const type = ticketType({ sectionKey: "d", seatsAvailable: 8, maxPerOrder: 3 });

    expect(
      filterListings([type], { quantity: 4, price: { min: 0, max: 1000 } }),
    ).toEqual([]);
  });

  it("keeps a type priced at exactly min*100 and exactly max*100 (SECT-25)", () => {
    const atMin = ticketType({ sectionKey: "c", priceCents: 20000 });
    const atMax = ticketType({ sectionKey: "vip", priceCents: 45000 });

    expect(
      filterListings([atMin, atMax], {
        quantity: 1,
        price: { min: 200, max: 450 },
      }),
    ).toEqual([atMin, atMax]);
  });

  it("drops a type priced one cent below min*100 (SECT-25)", () => {
    const belowMin = ticketType({ sectionKey: "c", priceCents: 19999 });

    expect(
      filterListings([belowMin], {
        quantity: 1,
        price: { min: 200, max: 450 },
      }),
    ).toEqual([]);
  });

  it("drops a type priced one cent above max*100 (SECT-25)", () => {
    const aboveMax = ticketType({ sectionKey: "vip", priceCents: 45001 });

    expect(
      filterListings([aboveMax], {
        quantity: 1,
        price: { min: 200, max: 450 },
      }),
    ).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const types = [ticketType({ sectionKey: "vip" })];
    const original = [...types];

    filterListings(types, { quantity: 1, price: { min: 0, max: 1000 } });

    expect(types).toEqual(original);
  });
});

describe("sortListings", () => {
  const vip = ticketType({ sectionKey: "vip", name: "VIP", priceCents: 45000 });
  const a = ticketType({ sectionKey: "a", name: "A", priceCents: 40000 });
  const b = ticketType({ sectionKey: "b", name: "B", priceCents: 30000 });

  it("orders by price descending by default (SECT-27)", () => {
    expect(sortListings([b, vip, a], "desc")).toEqual([vip, a, b]);
  });

  it("orders by price ascending (SECT-28)", () => {
    expect(sortListings([vip, a, b], "asc")).toEqual([b, a, vip]);
  });

  it("breaks ties by name ascending when sorting descending (SECT-27)", () => {
    const tieB = ticketType({ sectionKey: "b", name: "B", priceCents: 30000 });
    const tieA = ticketType({ sectionKey: "a", name: "A", priceCents: 30000 });

    expect(sortListings([tieB, tieA], "desc")).toEqual([tieA, tieB]);
  });

  it("breaks ties by name ascending when sorting ascending (SECT-28)", () => {
    const tieB = ticketType({ sectionKey: "b", name: "B", priceCents: 30000 });
    const tieA = ticketType({ sectionKey: "a", name: "A", priceCents: 30000 });

    expect(sortListings([tieB, tieA], "asc")).toEqual([tieA, tieB]);
  });

  it("returns a new array and does not mutate the input", () => {
    const types = [vip, b, a];
    const original = [...types];

    sortListings(types, "desc");

    expect(types).toEqual(original);
  });
});
