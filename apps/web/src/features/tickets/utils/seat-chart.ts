import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";

// Chart units are the seats' own x/y units (Figma px in the seeded chart).
// A seat icon is a SEAT_SIZE box centered on its x/y.
export const SEAT_SIZE = 28;

// The band above the top seat box where the chart draws the stage arc.
export const STAGE_HEIGHT = 64;

// From a row's rightmost seat center to the start of its label (frame 12).
const ROW_LABEL_OFFSET = 40;

// From the bottom row's lowest seat center to the column labels' line.
const COLUMN_LABEL_OFFSET = 54;

export interface ChartFrame {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface RowLabel {
  row: string;
  x: number;
  y: number;
}

export interface ColumnLabel {
  number: string;
  x: number;
  y: number;
}

function groupByRow(seats: Seat[]): Seat[][] {
  const rows = new Map<string, Seat[]>();

  for (const seat of seats) {
    rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat]);
  }

  return [...rows.values()];
}

function meanY(row: Seat[]): number {
  return row.reduce((sum, seat) => sum + seat.y, 0) / row.length;
}

// Row labels are anchored at the start of their text, at the y of the row's
// rightmost seat.
export function rowLabels(seats: Seat[]): RowLabel[] {
  return groupByRow(seats).map((row) => {
    const rightmost = row.reduce((a, b) => (b.x > a.x ? b : a));

    return {
      row: rightmost.row,
      x: rightmost.x + ROW_LABEL_OFFSET,
      y: rightmost.y,
    };
  });
}

// The bottom row's seat numbers, centered under each seat on one line.
export function columnLabels(seats: Seat[]): ColumnLabel[] {
  const rows = groupByRow(seats);

  if (rows.length === 0) {
    return [];
  }

  const bottom = rows.reduce((a, b) => (meanY(b) > meanY(a) ? b : a));
  const y = Math.max(...bottom.map((seat) => seat.y)) + COLUMN_LABEL_OFFSET;

  return bottom.map((seat) => ({ number: seat.number, x: seat.x, y }));
}

// The seat boxes, plus the stage band on top and about one seat of room past
// the row labels (right) and the column labels (bottom).
export function chartFrame(seats: Seat[]): ChartFrame {
  const half = SEAT_SIZE / 2;
  const xs = seats.map((seat) => seat.x);
  const ys = seats.map((seat) => seat.y);

  const minX = Math.min(...xs) - half;
  const minY = Math.min(...ys) - half - STAGE_HEIGHT;
  const right = Math.max(
    ...xs.map((x) => x + half),
    ...rowLabels(seats).map((label) => label.x + SEAT_SIZE),
  );
  const bottom = Math.max(
    ...ys.map((y) => y + half),
    ...columnLabels(seats).map((label) => label.y + half),
  );

  return { minX, minY, width: right - minX, height: bottom - minY };
}
