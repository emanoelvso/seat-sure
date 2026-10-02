import type { FindTicketTypeSeatsQuery } from "@/types/__generated__/graphql";

// A seat as findTicketTypeSeats returns it.
type Seat = FindTicketTypeSeatsQuery["findTicketTypeSeats"]["seats"][number];

const pad = (value: number) => String(value).padStart(2, "0");

const seat = (row: number, index: number, x: number, y: number): Seat => ({
  __typename: "Seat",
  id: `seat-${row}-${pad(index)}`,
  row: String(row),
  number: pad(index),
  x,
  y,
});

// The frame 12 chart (150 seats) as findTicketTypeSeats returns it, with the
// positions seeded by
// apps/api/src/module/catalog/persistence/migration/1790880600000-migration.ts.
// Rows 1-4 are arcs of 9, 11, 13 and 13 seats. Rows 5-12 hold 13 seats in
// blocks of 4, 5 and 4, with the middle block lower.
export const frame12Seats: Seat[] = [
  ...[9, 11, 13, 13].flatMap((n, index) =>
    Array.from({ length: n }, (_, i) =>
      seat(
        index + 1,
        i + 1,
        391 + (i + 1 - (n + 1) / 2) * 54,
        40 + index * 43 + 8 * Math.min(i, n - i - 1),
      ),
    ),
  ),
  ...Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 13 }, (_, i) => {
      const c = i + 1;
      const offset = c <= 4 ? 8 * (c - 1) : c <= 9 ? 32 : 8 * (13 - c);

      return seat(
        r + 5,
        c,
        40 + 54 * (c - 1) + (c > 4 ? 27 : 0) + (c > 9 ? 27 : 0),
        241 + r * 48 + offset,
      );
    }),
  ).flat(),
];

export const findSeat = (row: string, number: string): Seat =>
  frame12Seats.find((seat) => seat.row === row && seat.number === number)!;

// Frame 12's free seats: nine seats of row 7. Every other seat is taken.
const FREE_IN_ROW_7 = ["01", "02", "03", "06", "07", "08", "10", "12", "13"];

export const frame12UnavailableIds = new Set(
  frame12Seats
    .filter((seat) => seat.row !== "7" || !FREE_IN_ROW_7.includes(seat.number))
    .map((seat) => seat.id),
);
