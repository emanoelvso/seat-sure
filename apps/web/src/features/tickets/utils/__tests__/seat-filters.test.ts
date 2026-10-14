import { describe, expect, it } from "vitest";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  filteredOutIds,
  frontRowKeys,
  perkLabel,
  resolveSeatFilters,
  SEAT_PERKS,
  seatPriceBounds,
  viewRatingWord,
} from "@/features/tickets/utils/seat-filters";

const seat = (
  id: string,
  row: string,
  y: number,
  priceCents = 45000,
  perks: Seat["perks"] = [],
): Seat => ({
  __typename: "Seat",
  id,
  row,
  number: "01",
  x: 100,
  y,
  priceCents,
  perks,
});

// Row labels are not in stage order (L-006): by mean y the order is
// 9, 7, 8, 3, 1.
const rows = [
  seat("r1", "1", 500),
  seat("r3", "3", 300),
  seat("r7", "7", 100),
  seat("r8", "8", 200),
  seat("r9", "9", 50),
];

describe("SEAT_PERKS and perkLabel", () => {
  it("lists the three perks with their labels (PERK-03)", () => {
    expect(SEAT_PERKS).toEqual(["AISLE", "EXTRA_LEGROOM", "ACCESSIBLE"]);
    expect(SEAT_PERKS.map(perkLabel)).toEqual([
      "Aisle",
      "Extra legroom",
      "Accessible",
    ]);
  });
});

describe("seatPriceBounds", () => {
  it("floors the lowest and ceils the highest price in whole dollars (SFILT-01)", () => {
    expect(
      seatPriceBounds([seat("a", "1", 1, 45099), seat("b", "2", 2, 60001)]),
    ).toEqual({ min: 450, max: 601 });
  });

  it("returns null when all seats share one price (SFILT-02)", () => {
    expect(seatPriceBounds([seat("a", "1", 1), seat("b", "2", 2)])).toBeNull();
  });

  it("returns null without seats (SFILT-02)", () => {
    expect(seatPriceBounds([])).toBeNull();
  });
});

describe("frontRowKeys", () => {
  it("keeps the 3 rows with the smallest mean y, not the lowest labels (FRONT-02)", () => {
    expect(frontRowKeys(rows)).toEqual(new Set(["9", "7", "8"]));
  });

  it("averages the y of the seats of a row (FRONT-02)", () => {
    // Row "2" has a seat at y 10 but its mean y is 100, still the smallest.
    const chart = [
      seat("a1", "1", 120),
      seat("b1", "2", 10),
      seat("b2", "2", 190),
      seat("c1", "3", 130),
      seat("d1", "4", 140),
    ];

    expect(frontRowKeys(chart)).toEqual(new Set(["2", "1", "3"]));
  });

  it("keeps every row when the section has 3 rows or fewer (FRONT-04)", () => {
    expect(frontRowKeys(rows.slice(0, 3))).toEqual(new Set(["1", "3", "7"]));
  });
});

describe("resolveSeatFilters", () => {
  const priced = [seat("a", "1", 1, 60000), seat("b", "2", 2, 45000)];
  const url = { min: null, max: null, perks: null, front: null };

  it("defaults to the full price range, no perks and front rows off (SFILT-01)", () => {
    expect(resolveSeatFilters(url, priced)).toEqual({
      price: { min: 450, max: 600 },
      perks: [],
      front: false,
    });
  });

  it("uses min and max from the URL (SFILT-04)", () => {
    expect(
      resolveSeatFilters({ ...url, min: 400, max: 500 }, priced).price,
    ).toEqual({ min: 400, max: 500 });
  });

  it("falls back to the default range when min > max (SFILT-05)", () => {
    expect(
      resolveSeatFilters({ ...url, min: 9, max: 1 }, priced).price,
    ).toEqual({ min: 450, max: 600 });
  });

  it("accepts a range where min equals max (SFILT-05)", () => {
    expect(
      resolveSeatFilters({ ...url, min: 450, max: 450 }, priced).price,
    ).toEqual({ min: 450, max: 450 });
  });

  it("falls back to the default range when only one bound is given (SFILT-05)", () => {
    expect(resolveSeatFilters({ ...url, min: 500 }, priced).price).toEqual({
      min: 450,
      max: 600,
    });
  });

  it("has no price filter when the seats share one price (SFILT-02)", () => {
    expect(
      resolveSeatFilters({ ...url, min: 400, max: 500 }, [
        seat("a", "1", 1),
        seat("b", "2", 2),
      ]).price,
    ).toBeNull();
  });

  it("drops unknown perk codes and keeps the known ones (PERK-06)", () => {
    expect(
      resolveSeatFilters({ ...url, perks: ["AISLE", "WINDOW"] }, priced).perks,
    ).toEqual(["AISLE"]);
  });

  it("turns front rows on only for front=1 (FRONT-03)", () => {
    expect(resolveSeatFilters({ ...url, front: "1" }, priced).front).toBe(true);
    expect(resolveSeatFilters(url, priced).front).toBe(false);
  });
});

describe("filteredOutIds", () => {
  const off = { price: null, perks: [], front: false };

  const cheap = seat("cheap", "1", 1, 45000, ["AISLE"]);
  const dear = seat("dear", "2", 2, 60000, ["AISLE", "ACCESSIBLE"]);
  const plain = seat("plain", "3", 3, 45000);
  const chart = [cheap, dear, plain];

  it("excludes nothing without active filters", () => {
    expect(filteredOutIds(chart, off)).toEqual(new Set());
  });

  it("excludes seats priced outside the range, bounds inclusive (SFILT-03)", () => {
    expect(
      filteredOutIds(chart, { ...off, price: { min: 400, max: 450 } }),
    ).toEqual(new Set(["dear"]));
    expect(
      filteredOutIds(chart, { ...off, price: { min: 451, max: 600 } }),
    ).toEqual(new Set(["cheap", "plain"]));
  });

  it("excludes nothing when the range covers every price (SFILT-12)", () => {
    expect(
      filteredOutIds(chart, { ...off, price: { min: 450, max: 600 } }),
    ).toEqual(new Set());
  });

  it("excludes seats that lack a selected perk (PERK-04)", () => {
    expect(filteredOutIds(chart, { ...off, perks: ["AISLE"] })).toEqual(
      new Set(["plain"]),
    );
  });

  it("requires every selected perk, not any (PERK-04)", () => {
    expect(
      filteredOutIds(chart, { ...off, perks: ["AISLE", "ACCESSIBLE"] }),
    ).toEqual(new Set(["cheap", "plain"]));
  });

  it("excludes seats outside the front rows (FRONT-02)", () => {
    expect(filteredOutIds(rows, { ...off, front: true })).toEqual(
      new Set(["r1", "r3"]),
    );
  });

  it("excludes nothing for front rows in a section of 3 rows or fewer (FRONT-04)", () => {
    expect(filteredOutIds(chart, { ...off, front: true })).toEqual(new Set());
  });

  it("excludes a seat when any active filter rejects it (SFILT-06)", () => {
    const filters = {
      price: { min: 400, max: 500 },
      perks: ["AISLE" as const],
      front: false,
    };

    // dear is out by price, plain is out by perk, only cheap passes both.
    expect(filteredOutIds(chart, filters)).toEqual(new Set(["dear", "plain"]));
  });
});

describe("viewRatingWord", () => {
  it.each([
    [5, "Great"],
    [4.5, "Great"],
    [4.49, "Good"],
    [3.5, "Good"],
    [3.49, "Fair"],
    [0, "Fair"],
  ])("rates %s as %s (VIEW-04)", (score, word) => {
    expect(viewRatingWord(score)).toBe(word);
  });
});
