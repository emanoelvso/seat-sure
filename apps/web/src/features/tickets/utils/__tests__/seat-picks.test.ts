import { createLoader } from "nuqs/server";
import { describe, expect, it } from "vitest";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  byNumber,
  latestPick,
  pickSeat,
  resolveSeatQuantity,
  seatNotice,
  trimPicks,
} from "@/features/tickets/utils/seat-picks";
import { seatsParsers } from "@/features/tickets/utils/seats-search-params";

const seat = (
  id: string,
  row: string,
  number: string,
  x: number,
  y: number,
): Seat => ({
  __typename: "Seat",
  id,
  row,
  number,
  x,
  y,
  priceCents: 45000,
  perks: [],
});

// Row labels differ from seat numbers and x from y (L-006).
const s409 = seat("s-4-09", "4", "09", 175, 40);
const s410 = seat("s-4-10", "4", "10", 229, 48);
const s411 = seat("s-4-11", "4", "11", 283, 56);
const s502 = seat("s-5-02", "5", "02", 94, 249);
const seats = [s409, s410, s411, s502];

describe("pickSeat", () => {
  it("appends a seat of the picks' row while fewer than N are picked, in pick order (SEAT-19)", () => {
    expect(pickSeat([s411.id], s409, seats, 3)).toEqual([s411.id, s409.id]);
  });

  // The earliest pick (10) isn't the lowest number (09), so dropping by
  // number fails here.
  it("releases the earliest pick when N are picked and the seat is in the same row (SEAT-20)", () => {
    expect(pickSeat([s410.id, s409.id], s411, seats, 2)).toEqual([
      s409.id,
      s411.id,
    ]);
  });

  it("makes a seat in another row the only pick, even below N (SEAT-21)", () => {
    expect(pickSeat([s409.id, s410.id], s502, seats, 3)).toEqual([s502.id]);
  });

  it("releases a picked seat and keeps the other picks in order (SEAT-22)", () => {
    expect(pickSeat([s409.id, s410.id, s411.id], s410, seats, 3)).toEqual([
      s409.id,
      s411.id,
    ]);
  });

  it("replaces the only pick in any row when N is 1 (edge case)", () => {
    expect(pickSeat([s409.id], s410, seats, 1)).toEqual([s410.id]);
    expect(pickSeat([s409.id], s502, seats, 1)).toEqual([s502.id]);
  });
});

describe("latestPick", () => {
  // Picked 10, then 09: the latest is neither the highest number nor the
  // last seat in chart order.
  it("returns the most recently picked seat (SEAT-25)", () => {
    expect(latestPick([s410.id, s409.id], seats)).toEqual(s409);
  });

  it("returns the previous pick once the latest is released (SEAT-25)", () => {
    const picks = pickSeat([s410.id, s409.id], s409, seats, 2);

    expect(latestPick(picks, seats)).toEqual(s410);
  });

  it("returns undefined while nothing is picked (SEAT-14)", () => {
    expect(latestPick([], seats)).toBeUndefined();
  });
});

describe("byNumber", () => {
  it("puts 2 before 10 (SEAT-27)", () => {
    const two = seat("s-4-2", "4", "2", 121, 32);

    expect([s410, two].sort(byNumber).map(({ number }) => number)).toEqual([
      "2",
      "10",
    ]);
  });

  it("puts 09 before 10 (SEAT-27)", () => {
    expect([s410, s409].sort(byNumber).map(({ number }) => number)).toEqual([
      "09",
      "10",
    ]);
  });
});

describe("trimPicks", () => {
  // Picked 10, 09, 11: the earliest picks aren't the lowest numbers or the
  // latest picks.
  it("keeps the earliest picks up to a lower quantity (SEAT-38)", () => {
    const picks = [s410.id, s409.id, s411.id];

    expect(trimPicks(picks, 2)).toEqual([s410.id, s409.id]);
    expect(trimPicks(picks, 1)).toEqual([s410.id]);
  });

  it("keeps every pick when the quantity isn't below the pick count (SEAT-38)", () => {
    expect(trimPicks([s410.id, s409.id], 3)).toEqual([s410.id, s409.id]);
  });
});

describe("seatNotice", () => {
  // Two rows of 3 seats.
  const a1 = seat("a1", "1", "01", 40, 241);
  const a2 = seat("a2", "1", "02", 94, 249);
  const a3 = seat("a3", "1", "03", 148, 257);
  const b1 = seat("b1", "2", "01", 40, 289);
  const b2 = seat("b2", "2", "02", 94, 297);
  const b3 = seat("b3", "2", "03", 148, 305);
  const rows = [a1, a2, a3, b1, b2, b3];

  // Quantity 2, so a check that looks at rows first would answer the
  // "No row has 2 free seats" notice instead.
  it("says every seat is taken when none is available (SEAT-39)", () => {
    const allTaken = new Set(rows.map(({ id }) => id));

    expect(seatNotice(rows, allTaken, 2)).toBe(
      "All seats in this section are taken.",
    );
  });

  // 4 free seats in total, but at most 2 in one row.
  it("names N when the freest row has N - 1 free seats (SEAT-40)", () => {
    expect(seatNotice(rows, new Set([a1.id, b1.id]), 3)).toBe(
      "No row has 3 free seats together. Pick fewer tickets.",
    );
  });

  it("shows nothing when a row has N free seats (SEAT-40)", () => {
    expect(seatNotice(rows, new Set([b1.id, b2.id]), 3)).toBeNull();
  });

  // 6 unavailable ids for 6 seats, but one isn't a seat of this section:
  // b3 is still free.
  it("ignores an unavailable id that isn't one of the seats (SEAT-16 edge case)", () => {
    const unavailable = new Set([a1.id, a2.id, a3.id, b1.id, b2.id, "ghost"]);

    expect(seatNotice(rows, unavailable, 1)).toBeNull();
  });

  it("shows nothing when every seat is available (edge case)", () => {
    expect(seatNotice(rows, new Set(), 3)).toBeNull();
  });
});

describe("resolveSeatQuantity", () => {
  // Each kept value differs from the fallback 2 (L-001).
  it.each([3, 1, 8])(
    "starts at quantity=%i when it's within 1..maxPerOrder 8 (SEAT-35)",
    (quantity) => {
      expect(resolveSeatQuantity(quantity, 8)).toBe(quantity);
    },
  );

  it.each([null, 0, 9])(
    "falls back to 2 for quantity=%s with maxPerOrder 8 (SEAT-36)",
    (quantity) => {
      expect(resolveSeatQuantity(quantity, 8)).toBe(2);
    },
  );

  it.each([null, 2])(
    "falls back to 1 for quantity=%s with maxPerOrder 1 (SEAT-36)",
    (quantity) => {
      expect(resolveSeatQuantity(quantity, 1)).toBe(1);
    },
  );

  describe("with the URL param read by seatsParsers", () => {
    const loadSeatsSearchParams = createLoader(seatsParsers);

    it("starts at ?quantity=3 (SEAT-35)", () => {
      expect(
        resolveSeatQuantity(loadSeatsSearchParams("?quantity=3").quantity, 8),
      ).toBe(3);
    });

    // A parseInt parser reads "3.5" as 3, not the fallback.
    it.each(["abc", "3.5"])(
      "falls back to 2 for ?quantity=%s, which isn't an integer (SEAT-36)",
      (value) => {
        const { quantity } = loadSeatsSearchParams(
          new URLSearchParams({ quantity: value }),
        );

        expect(resolveSeatQuantity(quantity, 8)).toBe(2);
      },
    );
  });
});
