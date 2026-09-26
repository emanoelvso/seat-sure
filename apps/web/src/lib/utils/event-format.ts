import { format } from "date-fns";

interface EventPlace {
  venue: string;
  city: string;
  country: string;
}

export function formatEventDate(iso: string) {
  return format(new Date(iso), "MMM dd - yyyy");
}

export function formatEventTime(iso: string) {
  return format(new Date(iso), "h:mm a");
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
