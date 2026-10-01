import { describe, expect, it } from "vitest";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  chartFrame,
  columnLabels,
  rowLabels,
  SEAT_SIZE,
  STAGE_HEIGHT,
} from "@/features/tickets/utils/seat-chart";

const seat = (
  id: string,
  row: string,
  number: string,
  x: number,
  y: number,
): Seat => ({ __typename: "Seat", id, row, number, x, y });

const half = SEAT_SIZE / 2;

// Row labels differ from seat numbers, and inside each row the rightmost
// seat's y differs from the other seats' y (L-006).
// Row 1 is an arc: its middle seat sits lower than its ends.
const row1 = [
  seat("1-01", "1", "01", 175, 40),
  seat("1-02", "1", "02", 229, 72),
  seat("1-03", "1", "03", 283, 48),
];
const row7 = [
  seat("7-05", "7", "05", 121, 369),
  seat("7-09", "7", "09", 337, 377),
  seat("7-13", "7", "13", 742, 361),
];
// The bottom row: the largest mean y.
const row12 = [
  seat("12-02", "12", "02", 148, 585),
  seat("12-06", "12", "06", 391, 609),
  seat("12-13", "12", "13", 742, 577),
];
// min x (121) ≠ min y (40).
const seats = [...row1, ...row7, ...row12];

describe("chartFrame", () => {
  // The design pads the top, right and bottom only. Swapping min x and min y
  // starts the frame below the top seats.
  it("starts at the leftmost seat box and leaves STAGE_HEIGHT above the top seat box (SEAT-15)", () => {
    const frame = chartFrame(seats);

    expect(frame.minX).toBe(121 - half);
    expect(frame.minY).toBe(40 - half - STAGE_HEIGHT);
  });

  it("contains every seat box and room for the row and column labels (SEAT-15, SEAT-17)", () => {
    const frame = chartFrame(seats);
    const right = frame.minX + frame.width;
    const bottom = frame.minY + frame.height;

    for (const { x, y } of seats) {
      expect(x + half).toBeLessThanOrEqual(right);
      expect(y + half).toBeLessThanOrEqual(bottom);
    }
    // A row label's text starts at its anchor and a column label's text is
    // centered on it. Each is about one seat in size.
    for (const label of rowLabels(seats)) {
      expect(label.x + SEAT_SIZE).toBeLessThanOrEqual(right);
    }
    for (const label of columnLabels(seats)) {
      expect(label.y + half).toBeLessThanOrEqual(bottom);
    }
  });
});

describe("rowLabels", () => {
  // Frame 12 aligns every row label in one column. Row 1's rightmost seat
  // (283) isn't the chart's rightmost (742), so a label placed from its own
  // row's rightmost seat leaves that column.
  it("puts one label per row, in one column right of the chart's rightmost seat, at the y of the row's rightmost seat (SEAT-17)", () => {
    const labels = rowLabels(seats);
    const offset = labels[0].x - 742;

    expect(offset).toBeGreaterThan(half);
    expect(labels).toHaveLength(3);
    expect(labels).toEqual(
      expect.arrayContaining([
        { row: "1", x: 742 + offset, y: 48 },
        { row: "7", x: 742 + offset, y: 361 },
        { row: "12", x: 742 + offset, y: 577 },
      ]),
    );
    // The column follows the chart: with row 1 alone, it sits the same
    // offset right of seat 283.
    expect(rowLabels(row1)).toEqual([{ row: "1", x: 283 + offset, y: 48 }]);
  });
});

describe("columnLabels", () => {
  it.each([
    ["first", [...row12, ...row1, ...row7]],
    ["between the other rows", [...row1, ...row12, ...row7]],
  ])(
    "labels each seat of the row with the largest mean y under it, when that row comes %s (SEAT-17)",
    (_, input) => {
      const labels = columnLabels(input);
      const { y } = labels[0];

      // One line, under the row's lowest seat box (609).
      expect(y - 609).toBeGreaterThan(half);
      expect(labels).toHaveLength(3);
      expect(labels).toEqual(
        expect.arrayContaining([
          { number: "02", x: 148, y },
          { number: "06", x: 391, y },
          { number: "13", x: 742, y },
        ]),
      );
    },
  );
});
