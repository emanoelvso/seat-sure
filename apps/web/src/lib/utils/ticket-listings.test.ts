import { describe, expect, it } from "vitest";
import {
  defaultQuantity,
  filterListings,
  type GqlTicketType,
  listingsLabel,
  priceBounds,
  quantityLabel,
  quantityOptions,
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

describe("quantityOptions", () => {
  it("uses the max maxPerOrder across the given types (SECT-21)", () => {
    const types = [
      ticketType({ sectionKey: "a", maxPerOrder: 4 }),
      ticketType({ sectionKey: "b", maxPerOrder: 6 }),
    ];

    expect(quantityOptions(types)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns [1] when there are no types (SECT-21)", () => {
    expect(quantityOptions([])).toEqual([1]);
  });
});

describe("defaultQuantity", () => {
  it("is 2 when the options go up to 6 (SECT-21)", () => {
    expect(defaultQuantity([1, 2, 3, 4, 5, 6])).toBe(2);
  });

  it("is 1 when the only option is 1 (SECT-21)", () => {
    expect(defaultQuantity([1])).toBe(1);
  });
});

describe("priceBounds", () => {
  it("returns the min and max in whole dollars (SECT-24)", () => {
    const types = [
      ticketType({ sectionKey: "c", priceCents: 20000 }),
      ticketType({ sectionKey: "vip", priceCents: 45000 }),
    ];

    expect(priceBounds(types)).toEqual({ min: 200, max: 450 });
  });

  it("floors the min and ceils the max (SECT-24)", () => {
    const types = [
      ticketType({ sectionKey: "c", priceCents: 19999 }),
      ticketType({ sectionKey: "vip", priceCents: 45001 }),
    ];

    expect(priceBounds(types)).toEqual({ min: 199, max: 451 });
  });

  it("returns null when there are no types (SECT-24)", () => {
    expect(priceBounds([])).toBeNull();
  });
});

describe("listingsLabel", () => {
  it("returns '0 Listings' for zero (SECT-11)", () => {
    expect(listingsLabel(0)).toBe("0 Listings");
  });

  it("returns '1 Listing' for one (SECT-11)", () => {
    expect(listingsLabel(1)).toBe("1 Listing");
  });

  it("returns '4 Listings' for four (SECT-11)", () => {
    expect(listingsLabel(4)).toBe("4 Listings");
  });
});

describe("quantityLabel", () => {
  it("returns '1 ticket' for one (SECT-23)", () => {
    expect(quantityLabel(1)).toBe("1 ticket");
  });

  it("returns '2 tickets, seated together' for two (SECT-23)", () => {
    expect(quantityLabel(2)).toBe("2 tickets, seated together");
  });
});
