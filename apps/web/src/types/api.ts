import type { Event } from "@/types/__generated__/schema";

// Entities shared by two or more features.

// SPEC_DEVIATION: the design picks only the first ten fields.
// Reason: FestivalBanner reads `description` and EventDateCard reads `tags`,
// which only the artist query selects, so they're optional here.
export type EventSummary = Pick<
  Event,
  | "id"
  | "name"
  | "coverImage"
  | "venue"
  | "city"
  | "country"
  | "date"
  | "startAt"
  | "price"
  | "category"
> &
  Partial<Pick<Event, "description" | "tags">>;
