import { parseAsStrictInteger } from "@/utils/search-params";

// Read by the seat page view (useQueryStates). `nuqs/server` has no
// "use client" directive, so the server can import these parsers too.
export const seatsParsers = {
  quantity: parseAsStrictInteger,
};
