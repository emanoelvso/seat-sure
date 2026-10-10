import {
  createLoader,
  createParser,
  createSerializer,
  inferParserType,
  parseAsStringLiteral,
} from "nuqs/server";
import { parseAsStrictInteger } from "@/utils/search-params";

// Shared by the server page (loader) and the client tabs and pagination
// (serializer). `nuqs/server` has no "use client" directive, so both sides
// can import it.

export const NOTIFICATIONS_PAGE_SIZE = 10;

export const NOTIFICATION_TABS = ["all", "unread", "read"] as const;

export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

// A strict integer of 1 or more (NOTIF-06 AC 9): 0, negatives and
// non-integers read as unset, so the page falls back to 1.
const parseAsNotificationsPage = createParser({
  parse(value) {
    const page = parseAsStrictInteger.parse(value);
    return page !== null && page >= 1 ? page : null;
  },
  serialize: parseAsStrictInteger.serialize,
});

export const accountNotificationsParsers = {
  tab: parseAsStringLiteral(NOTIFICATION_TABS).withDefault("all"),
  page: parseAsNotificationsPage.withDefault(1),
};

export type AccountNotificationsSearchParams = inferParserType<
  typeof accountNotificationsParsers
>;

export const loadAccountNotificationsSearchParams = createLoader(
  accountNotificationsParsers,
);
export const serializeAccountNotificationsSearchParams = createSerializer(
  accountNotificationsParsers,
);
