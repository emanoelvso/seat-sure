import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import { env } from "@/config/env";

interface EventPlace {
  venue: string;
  city: string;
  country: string;
}

export function formatEventDate(iso: string, timeZone = env.timeZone) {
  return format(new Date(iso), "MMM dd - yyyy", { in: tz(timeZone) });
}

export function formatEventTime(iso: string, timeZone = env.timeZone) {
  return format(new Date(iso), "h:mm a", { in: tz(timeZone) });
}

export function formatEventTimeRange(
  startIso: string,
  endIso: string,
  timeZone = env.timeZone,
) {
  return `${formatEventTime(startIso, timeZone)} - ${formatEventTime(endIso, timeZone)}`;
}

export function formatEventLocation({ venue, city, country }: EventPlace) {
  return `${venue} - ${city}, ${country}`;
}

export function formatVenueAddress({ venue, city, country }: EventPlace) {
  return `${venue}, ${city}, ${country}`;
}

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
