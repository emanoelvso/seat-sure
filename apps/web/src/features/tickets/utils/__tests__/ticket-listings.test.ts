import { describe, expect, it } from "vitest";
import type { TicketType } from "@/features/tickets/api/find-event-tickets";
import {
  defaultQuantity,
  filterListings,
  listingsLabel,
  narrowListings,
  priceBounds,
  quantityLabel,
  quantityOptions,
  resolveTicketFilters,
  sortListings,
} from "@/features/tickets/utils/ticket-listings";

const ticketType = (overrides: Partial<TicketType>): TicketType => ({
  __typename: "TicketType",
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

describe("narrowListings", () => {
  // Two "b" entries at the first and last positions, so a result that keeps
  // only one of them, or reorders them, fails.
  const bFirst = ticketType({ id: "b-first", sectionKey: "b", name: "B" });
  const a = ticketType({ sectionKey: "a", name: "A" });
  const c = ticketType({ sectionKey: "c", name: "C" });
  const bLast = ticketType({ id: "b-last", sectionKey: "b", name: "B2" });
  const types = [bFirst, a, c, bLast];

  it("returns every type in input order when no key is given (STAD-13)", () => {
    expect(narrowListings(types, undefined)).toEqual([bFirst, a, c, bLast]);
  });

  it("keeps only the types of the given section, in input order (STAD-11)", () => {
    expect(narrowListings(types, "b")).toEqual([bFirst, bLast]);
  });

  it("returns an empty list for a key with no types (STAD-11)", () => {
    expect(narrowListings(types, "lawn")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = [...types];

    narrowListings(input, "b");

    expect(input).toEqual([bFirst, a, c, bLast]);
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

describe("resolveTicketFilters", () => {
  // Options 1..6 (default 2) and bounds $200-$450, so each kept value below
  // differs from the fallback (L-001).
  const types = [
    ticketType({ sectionKey: "c", priceCents: 20000, maxPerOrder: 4 }),
    ticketType({ sectionKey: "vip", priceCents: 45000, maxPerOrder: 6 }),
  ];
  const bounds = { min: 200, max: 450 };
  const noParams = { quantity: null, min: null, max: null };

  it.each([1, 6])("keeps quantity %i, one of the options (MIG-48)", (quantity) => {
    expect(resolveTicketFilters({ ...noParams, quantity }, types).quantity).toBe(
      quantity,
    );
  });

  it.each([0, 7, null])(
    "falls back to the default quantity for %s (MIG-49)",
    (quantity) => {
      expect(
        resolveTicketFilters({ ...noParams, quantity }, types).quantity,
      ).toBe(2);
    },
  );

  it("keeps min and max inside the bounds (MIG-48)", () => {
    expect(
      resolveTicketFilters({ quantity: null, min: 250, max: 420 }, types).price,
    ).toEqual({ min: 250, max: 420 });
  });

  it("keeps a range where min equals max (MIG-50)", () => {
    expect(
      resolveTicketFilters({ quantity: null, min: 300, max: 300 }, types).price,
    ).toEqual({ min: 300, max: 300 });
  });

  it.each([
    ["max is missing", { min: 250, max: null }],
    ["min is missing", { min: null, max: 420 }],
    ["min > max", { min: 420, max: 250 }],
    ["both are missing", { min: null, max: null }],
  ])("falls back to the price bounds when %s (MIG-50)", (_, range) => {
    expect(
      resolveTicketFilters({ quantity: null, ...range }, types).price,
    ).toEqual(bounds);
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
