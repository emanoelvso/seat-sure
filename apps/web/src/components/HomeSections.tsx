"use client";

import { TZDate } from "@date-fns/tz";
import { useQuery } from "@apollo/client/react";
import {
  GET_HOME_SECTIONS,
  GetHomeSectionsData,
  GqlEvent,
} from "@/graphql/queries/home-sections";
import { EventShowcase } from "./event-showcase";
import SingersCarousel, { Singer } from "./SingersCarousel";
import { toCardProps } from "@/utils/card-props";
import { env } from "@/config/env";

function toSingerProps(events: GqlEvent[]): Singer[] {
  return events.map((c) => {
    const date = new TZDate(c.date, env.timeZone);

    return {
      name: c.name,
      date: `${date.getDay()} ${date.toLocaleString("en-US", { month: "long" })}`,
      location: c.city,
      imageUrl: c.coverImage,
    };
  });
}

export default function HomeSections() {
  const { data, loading, error } =
    useQuery<GetHomeSectionsData>(GET_HOME_SECTIONS);

  if (loading) return <p className="text-neutral-400 py-20">Loading events…</p>;
  if (error)
    return <p className="text-red-400 py-20">Failed to load events.</p>;

  const { concerts, shows, sports, festivals } = data!.getHomeSections;
  const mid = Math.ceil(concerts.events!.length / 2);
  const concertsFirstRow = concerts.events!.slice(0, mid);
  const concertsSecondRow = concerts.events!.slice(mid);

  return (
    <>
      <EventShowcase
        title="Concert"
        subCategories={concerts.categories}
        events={toCardProps(concerts.events ?? [])}
      />
      <EventShowcase
        title="Show"
        subCategories={shows.categories}
        events={toCardProps(shows.events ?? [])}
      />
      <section
        aria-label="Top Singers"
        className="flex flex-col items-center w-full mb-25"
      >
        <h2 className="font-medium text-2xl mb-2">Top Singers</h2>
        <p className="text-[#999999] mb-8">
          Find the singers you&apos;re looking for quickly.{" "}
          <span className="text-tint-400">You can see more</span>.
        </p>
        <SingersCarousel
          row1={toSingerProps(concertsFirstRow!)}
          row2={toSingerProps(concertsSecondRow!)}
        />
      </section>

      <EventShowcase
        title="Sport"
        subCategories={sports.categories}
        events={toCardProps(sports.events ?? [])}
      />
      <EventShowcase
        title="Festivals"
        subCategories={festivals.categories}
        events={toCardProps(festivals.events ?? [])}
      />
    </>
  );
}
