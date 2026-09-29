import { inferParserType, parseAsStringLiteral } from "nuqs/server";
import { parseAsStrictInteger } from "@/utils/search-params";

// Read on the server render and by the client view (useQueryStates).
// `nuqs/server` has no "use client" directive, so both sides can import it.

const SORT_ORDERS = ["asc", "desc"] as const;

export const ticketsParsers = {
  quantity: parseAsStrictInteger,
  min: parseAsStrictInteger,
  max: parseAsStrictInteger,
  sort: parseAsStringLiteral(SORT_ORDERS).withDefault("desc"),
};

export type TicketsSearchParams = inferParserType<typeof ticketsParsers>;
