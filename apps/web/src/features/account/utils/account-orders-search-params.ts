import {
  createLoader,
  createParser,
  createSerializer,
  inferParserType,
  parseAsStringLiteral,
} from "nuqs/server";
import { parseAsStrictInteger } from "@/utils/search-params";

// Shared by the server page (loader, serializer) and the client sort menu
// (useQueryStates). `nuqs/server` has no "use client" directive, so both
// sides can import it.

export const ACCOUNT_ORDERS_PAGE_SIZE = 4;

export const ORDER_STATUSES = [
  "all",
  "pending",
  "canceled",
  "completed",
] as const;

export const ORDER_SORTS = ["newest", "oldest", "highest", "lowest"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderSort = (typeof ORDER_SORTS)[number];

// A strict integer of 1 or more (ORDLIST-06): 0, negatives and non-integers
// read as unset, so the page falls back to 1.
const parseAsOrdersPage = createParser({
  parse(value) {
    const page = parseAsStrictInteger.parse(value);
    return page !== null && page >= 1 ? page : null;
  },
  serialize: parseAsStrictInteger.serialize,
});

export const accountOrdersParsers = {
  status: parseAsStringLiteral(ORDER_STATUSES).withDefault("all"),
  sort: parseAsStringLiteral(ORDER_SORTS).withDefault("newest"),
  page: parseAsOrdersPage.withDefault(1),
};

export type AccountOrdersSearchParams = inferParserType<
  typeof accountOrdersParsers
>;

export const loadAccountOrdersSearchParams = createLoader(accountOrdersParsers);
export const serializeAccountOrdersSearchParams = createSerializer(
  accountOrdersParsers,
);
