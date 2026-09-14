"use client";

import { useQuery } from "@apollo/client/react";
import {
  GET_HOME_SECTIONS,
  GetHomeSectionsData,
  GqlEvent,
} from "@/graphql/queries/home-sections";
import EventShowcase from "./EventShowcase";
import { MainCardProps } from "./MainCard";

function toCardProps(events: GqlEvent[]): MainCardProps[] {
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
  }));
}

export default function HomeSections() {
  const { data, loading, error } = useQuery<GetHomeSectionsData>(GET_HOME_SECTIONS);

  if (loading) return <p className="text-neutral-400 py-20">Loading events…</p>;
  if (error) return <p className="text-red-400 py-20">Failed to load events.</p>;

  const { concerts, shows, sports } = data!.getHomeSections;

  return (
    <>
      <EventShowcase
        title="Concert"
        subCategories={["All", "Pop", "Rock", "Jazz & Blues", "Hip-Hop & Rap", "Alternative", "Classical", "Opera", "Country"]}
        events={toCardProps(concerts ?? [])}
      />
      <EventShowcase
        title="Show"
        subCategories={["All", "Teather", "Comedy", "Magic", "Musical", "Circus", "Dance", "Puppetry", "Live Drama"]}
        events={toCardProps(shows ?? [])}
      />
      <EventShowcase
        title="Sport"
        subCategories={["All", "Running", "Basketball", "Football", "Soccer", "Golf", "Volleyball", "Tennis", "Hockey", "Motor", "Snow Sport", "Rugby", "Yoga"]}
        events={toCardProps(sports ?? [])}
      />
    </>
  );
}
