export interface GqlTicketType {
  id: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string[];
}

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
