import { TZDate } from "@date-fns/tz";
import { format, isValid, parse } from "date-fns";
import {
  createLoader,
  createParser,
  createSerializer,
  inferParserType,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { env } from "@/config/env";
import { EVENT_TYPES } from "@/utils/event-types";
import { parseAsStrictInteger } from "@/utils/search-params";

// Shared by the server page (loader, serializer) and the client filters
// (useQueryStates). `nuqs/server` has no "use client" directive, so both
// sides can import it.

export const PRICE_RANGES = ["-100", "100-300", "300-500", "+500"] as const;

export type PriceRange = (typeof PRICE_RANGES)[number];

export const PRICE_LABELS: Record<PriceRange, string> = {
  "-100": "Under $100",
  "100-300": "$100-300$",
  "300-500": "$300-$500",
  "+500": "Over $500",
};

const PAGE_SIZE = 20;
const MAX_PAGE = 50;

function clampPage(page: number) {
  return Math.min(Math.max(page, 1), MAX_PAGE);
}

// A `yyyy-MM-dd` calendar day, kept as a string. The round trip rejects days
// that don't exist (2026-02-30) and unpadded ones (2026-1-5).
const parseAsCalendarDay = createParser({
  parse(value) {
    const day = parse(value, "yyyy-MM-dd", new Date());
    return isValid(day) && format(day, "yyyy-MM-dd") === value ? value : null;
  },
  serialize: (value: string) => value,
});

// A strict integer (MIG-45, see the SPEC_DEVIATION in utils/search-params),
// clamped to 1..50 (MIG-46).
const parseAsPage = createParser({
  parse(value) {
    const page = parseAsStrictInteger.parse(value);
    return page === null ? null : clampPage(page);
  },
  serialize: parseAsStrictInteger.serialize,
});

export const eventsParsers = {
  type: parseAsStringLiteral(EVENT_TYPES),
  price: parseAsStringLiteral(PRICE_RANGES),
  city: parseAsString,
  from: parseAsCalendarDay,
  to: parseAsCalendarDay,
  page: parseAsPage.withDefault(1),
};

export type EventsSearchParams = inferParserType<typeof eventsParsers>;

export const loadEventsSearchParams = createLoader(eventsParsers);
export const serializeEventsSearchParams = createSerializer(eventsParsers);

export function priceRangeFor(price: PriceRange | null | undefined) {
  switch (price) {
    case "-100":
      return { min: 100 };
    case "100-300":
      return { min: 100, max: 300 };
    case "300-500":
      return { min: 300, max: 500 };
    case "+500":
      return { min: 500 };
  }
}

// The instant the calendar day starts in the configured time zone.
function startOfDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const start = new TZDate(year, month - 1, date, 0, 0, env.timeZone);
  return new Date(start.getTime()).toISOString();
}

export function toFindEventsInput({
  type,
  city,
  price,
  from,
  to,
  page = 1,
}: Partial<EventsSearchParams>) {
  return {
    type: type ?? undefined,
    city: city ?? undefined,
    priceRange: priceRangeFor(price),
    dateRange: from
      ? { from: startOfDay(from), ...(to ? { to: startOfDay(to) } : {}) }
      : undefined,
    limit: clampPage(page) * PAGE_SIZE,
    offset: 0,
  };
}
