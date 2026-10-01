import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import { defaultQuantity } from "@/features/tickets/utils/ticket-listings";

// Picks are seat ids in pick order, earliest first, all in one row. Callers
// never pass an unavailable seat: the chart doesn't report one (SEAT-23).
export function pickSeat(
  picks: string[],
  seat: Seat,
  seats: Seat[],
  quantity: number,
): string[] {
  if (picks.includes(seat.id)) {
    return picks.filter((id) => id !== seat.id);
  }

  const row = seats.find(({ id }) => id === picks[0])?.row;

  if (row !== undefined && row !== seat.row) {
    return [seat.id];
  }

  // With N picked, the earliest picks make room for the new one.
  const kept =
    picks.length < quantity ? picks : picks.slice(picks.length - quantity + 1);

  return [...kept, seat.id];
}

export function trimPicks(picks: string[], quantity: number): string[] {
  return picks.slice(0, quantity);
}

export function latestPick(picks: string[], seats: Seat[]): Seat | undefined {
  const id = picks.at(-1);

  return seats.find((seat) => seat.id === id);
}

// Seat numbers are labels such as "09" or "10", compared as numbers.
export function byNumber(a: Seat, b: Seat): number {
  return a.number.localeCompare(b.number, undefined, { numeric: true });
}

export function seatNotice(
  seats: Seat[],
  unavailable: Set<string>,
  quantity: number,
): string | null {
  const freePerRow = new Map<string, number>();

  for (const seat of seats) {
    if (!unavailable.has(seat.id)) {
      freePerRow.set(seat.row, (freePerRow.get(seat.row) ?? 0) + 1);
    }
  }

  if (freePerRow.size === 0) {
    return "All seats in this section are taken.";
  }

  if (Math.max(...freePerRow.values()) < quantity) {
    return `No row has ${quantity} free seats together. Pick fewer tickets.`;
  }

  return null;
}

// The quantity the URL asks for, or the default when it's missing or outside
// 1..maxPerOrder (SEAT-35, SEAT-36).
export function resolveSeatQuantity(
  param: number | null,
  maxPerOrder: number,
): number {
  const options = Array.from({ length: maxPerOrder }, (_, index) => index + 1);

  return param !== null && options.includes(param)
    ? param
    : defaultQuantity(options);
}
