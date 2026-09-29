import { addMonths } from "date-fns";
import { EventSummary } from "@/types/api";

interface CityEvents {
  city: string;
  country: string;
  events?: EventSummary[] | null;
}

export function cityKey({ city, country }: { city: string; country: string }) {
  return `${city}|${country}`;
}

export function splitArtistEvents<T extends CityEvents>(
  groups: T[],
  selectedKey: string | undefined,
  now: Date,
) {
  const selected = groups.find((group) => cityKey(group) === selectedKey);
  const horizon = addMonths(now, 6);

  const upcomingElsewhere = groups
    .filter((group) => group !== selected)
    .flatMap((group) => group.events ?? [])
    .filter((event) => new Date(event.startAt) < horizon)
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

  return { selected, upcomingElsewhere };
}
