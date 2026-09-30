import { MainCardProps } from "@/components/main-card";
import { env } from "@/config/env";
import { paths } from "@/config/paths";
import { EventSummary } from "@/types/api";

export function toCardProps(events: EventSummary[]): MainCardProps[] {
  return events.map((event) => ({
    avatarUrl: event.coverImage,
    name: event.name,
    date: new Date(event.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: env.timeZone,
    }),
    location: event.city,
    price: event.price,
    category: event.category,
    href: paths.eventTickets.getHref(event.id),
  }));
}
