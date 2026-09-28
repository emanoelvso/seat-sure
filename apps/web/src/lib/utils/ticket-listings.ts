import { GqlTicketType } from "@/graphql/queries/find-event-tickets";

export interface PriceRange {
  min: number;
  max: number;
}

export function filterListings(
  types: GqlTicketType[],
  { quantity, price }: { quantity: number; price: PriceRange },
): GqlTicketType[] {
  const minCents = price.min * 100;
  const maxCents = price.max * 100;

  return types.filter(
    (ticketType) =>
      ticketType.seatsAvailable >= quantity &&
      ticketType.maxPerOrder >= quantity &&
      ticketType.priceCents >= minCents &&
      ticketType.priceCents <= maxCents,
  );
}

export function quantityOptions(types: GqlTicketType[]): number[] {
  if (types.length === 0) {
    return [1];
  }

  const max = Math.max(...types.map((ticketType) => ticketType.maxPerOrder));

  return Array.from({ length: max }, (_, index) => index + 1);
}

export function defaultQuantity(options: number[]): number {
  return Math.min(2, options.at(-1)!);
}

export function priceBounds(types: GqlTicketType[]): PriceRange | null {
  if (types.length === 0) {
    return null;
  }

  const cents = types.map((ticketType) => ticketType.priceCents);

  return {
    min: Math.floor(Math.min(...cents) / 100),
    max: Math.ceil(Math.max(...cents) / 100),
  };
}

export function listingsLabel(count: number): string {
  return `${count} ${count === 1 ? "Listing" : "Listings"}`;
}

export function quantityLabel(quantity: number): string {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets, seated together`;
}

export function sortListings(
  types: GqlTicketType[],
  order: "desc" | "asc",
): GqlTicketType[] {
  const direction = order === "desc" ? -1 : 1;

  return [...types].sort((a, b) => {
    if (a.priceCents !== b.priceCents) {
      return (a.priceCents - b.priceCents) * direction;
    }

    return a.name.localeCompare(b.name);
  });
}
