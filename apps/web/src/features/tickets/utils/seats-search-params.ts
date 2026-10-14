import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { parseAsStrictInteger } from "@/utils/search-params";

// Read by the seat page view (useQueryStates). `nuqs/server` has no
// "use client" directive, so the server can import these parsers too.
export const seatsParsers = {
  quantity: parseAsStrictInteger,
  min: parseAsStrictInteger,
  max: parseAsStrictInteger,
  // Plain strings: resolveSeatFilters drops the unknown codes (PERK-06).
  perks: parseAsArrayOf(parseAsString),
  front: parseAsStringLiteral(["1"] as const),
};
