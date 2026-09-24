import { MainCardProps } from "@/components/MainCard";
import { GqlEvent } from "@/graphql/queries/home-sections";

export function toCardProps(events: GqlEvent[]): MainCardProps[] {
  return events.map((event) => ({
    avatarUrl: event.coverImage,
    name: event.name,
    date: new Date(event.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    location: event.city,
    price: event.price,
    category: event.category,
  }));
}
