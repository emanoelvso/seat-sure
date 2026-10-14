import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import type { PriceRange } from "@/features/tickets/utils/ticket-listings";
import type { SeatPerk } from "@/types/__generated__/graphql";

export const SEAT_PERKS = ["AISLE", "EXTRA_LEGROOM", "ACCESSIBLE"] as const;

const PERK_LABELS: Record<SeatPerk, string> = {
  AISLE: "Aisle",
  EXTRA_LEGROOM: "Extra legroom",
  ACCESSIBLE: "Accessible",
};

const FRONT_ROW_COUNT = 3;

export interface SeatFilters {
  /** null = no price filter (the seats share one price). */
  price: PriceRange | null;
  perks: SeatPerk[];
  front: boolean;
}

export interface SeatFilterParams {
  min: number | null;
  max: number | null;
  perks: string[] | null;
  front: "1" | null;
}

export function perkLabel(perk: SeatPerk): string {
  return PERK_LABELS[perk];
}

// null when the seats share one price: a one-price range filters nothing.
export function seatPriceBounds(seats: Seat[]): PriceRange | null {
  const cents = seats.map((seat) => seat.priceCents);

  if (cents.length === 0 || Math.min(...cents) === Math.max(...cents)) {
    return null;
  }

  return {
    min: Math.floor(Math.min(...cents) / 100),
    max: Math.ceil(Math.max(...cents) / 100),
  };
}

// The rows closest to the stage, which the chart draws above the top row
// (smallest mean y).
export function frontRowKeys(seats: Seat[]): Set<string> {
  const ys = new Map<string, number[]>();

  for (const seat of seats) {
    ys.set(seat.row, [...(ys.get(seat.row) ?? []), seat.y]);
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return new Set(
    [...ys.entries()]
      .sort(([, a], [, b]) => mean(a) - mean(b))
      .slice(0, FRONT_ROW_COUNT)
      .map(([row]) => row),
  );
}

// The filters the URL asks for, or "no filter" where a param is missing or
// invalid (SFILT-05, PERK-06).
export function resolveSeatFilters(
  { min, max, perks, front }: SeatFilterParams,
  seats: Seat[],
): SeatFilters {
  const bounds = seatPriceBounds(seats);

  return {
    price:
      bounds !== null && min !== null && max !== null && min <= max
        ? { min, max }
        : bounds,
    perks: SEAT_PERKS.filter((perk) => perks?.includes(perk)),
    front: front === "1",
  };
}

export function filteredOutIds(
  seats: Seat[],
  filters: SeatFilters,
): Set<string> {
  const front = filters.front ? frontRowKeys(seats) : null;

  return new Set(
    seats
      .filter(
        (seat) =>
          (filters.price !== null &&
            (seat.priceCents < filters.price.min * 100 ||
              seat.priceCents > filters.price.max * 100)) ||
          !filters.perks.every((perk) => seat.perks.includes(perk)) ||
          (front !== null && !front.has(seat.row)),
      )
      .map((seat) => seat.id),
  );
}

export function viewRatingWord(score: number): "Great" | "Good" | "Fair" {
  if (score >= 4.5) return "Great";

  return score >= 3.5 ? "Good" : "Fair";
}
