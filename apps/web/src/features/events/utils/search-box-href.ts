import { serializeEventsSearchParams } from "@/features/events/utils/events-search-params";
import type { EventType } from "@/utils/event-types";

interface SearchBoxValues {
  type: EventType | null;
  city: string;
  day: string;
}

// The /events URL for what the home search box holds. Blank fields are left
// out; a picked day becomes a one-day range.
export function searchBoxHref({ type, city, day }: SearchBoxValues) {
  const trimmed = city.trim();
  return serializeEventsSearchParams("/events", {
    type,
    city: trimmed || null,
    from: day || null,
    to: day || null,
  });
}
