"use client";

import { EventDateCard } from "@/features/artists/components/event-date-card";
import { EventShowcase } from "@/components/event-showcase";
import { FestivalBanner } from "@/features/artists/components/festival-banner";
import { Header } from "@/components/layouts/header";
import { LocationSelect } from "@/components/ui/location-select";
import { VenueMapCard } from "@/features/artists/components/venue-map-card";
import { FindArtistBySlug } from "@/features/artists/api/find-artist-by-slug";
import { cityKey, splitArtistEvents } from "@/features/artists/utils/artist-events";
import { toCardProps } from "@/utils/card-props";
import { formatVenueAddress } from "@/utils/event-format";
import Image from "next/image";
import { useId, useState } from "react";

export function ArtistView({
  data,
  now,
}: {
  data: FindArtistBySlug;
  now: string;
}) {
  const [selectedCity, setSelectedCity] = useState<string>();
  const datesHeadingId = useId();
  const elsewhereHeadingId = useId();

  // The page already called notFound() when artist is null.
  const artist = data.artist!;
  const eventsByCity = data.eventsByCity ?? [];
  const nearbyEvents = data.nearbyEvents ?? [];
  const festival = data.featuredFestival;

  const cityKeys = eventsByCity.map(cityKey);
  const selectedKey =
    selectedCity && cityKeys.includes(selectedCity)
      ? selectedCity
      : cityKeys[0];
  const { selected, upcomingElsewhere } = splitArtistEvents(
    eventsByCity,
    selectedKey,
    new Date(now),
  );
  const mapVenue = selected?.events?.[0];

  return (
    <>
      <section
        aria-label={`${artist.name} hero`}
        className="relative flex h-[460px] flex-col overflow-hidden"
      >
        <Image
          src={artist.cover}
          alt=""
          fill
          fetchPriority="high"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />

        <Header transparent />

        <div className="relative z-10 mt-auto flex max-w-[642px] flex-col gap-4 px-27 pb-[69px]">
          <h1 className="text-6xl font-bold">{artist.name}</h1>
          <p className="text-lg font-medium">{artist.bio}</p>
        </div>
      </section>

      <div className="flex gap-6 px-27 pb-12">
        <div className="flex min-w-0 flex-1 flex-col gap-12 pt-10">
          <section
            aria-labelledby={datesHeadingId}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
              <h2 id={datesHeadingId} className="text-3xl font-semibold">
                All days and times
              </h2>
              {selectedKey && (
                <LocationSelect
                  options={eventsByCity.map((group) => ({
                    value: cityKey(group),
                    label: `${group.city}, ${group.country}`,
                  }))}
                  value={selectedKey}
                  onChange={setSelectedCity}
                />
              )}
            </div>
            {selected ? (
              selected.events?.map((event) => (
                <EventDateCard
                  key={event.id}
                  event={event}
                  shareTitle={`${artist.name} - ${event.venue}`}
                />
              ))
            ) : (
              <p className="text-xl text-neutral-200">No upcoming dates</p>
            )}
          </section>

          {festival && <FestivalBanner event={festival} />}

          {upcomingElsewhere.length > 0 && (
            <section
              aria-labelledby={elsewhereHeadingId}
              className="flex flex-col gap-4"
            >
              <h2
                id={elsewhereHeadingId}
                className="border-b border-neutral-700 pb-4 text-3xl font-semibold"
              >
                Until 6 months
              </h2>
              {upcomingElsewhere.map((event) => (
                <EventDateCard
                  key={event.id}
                  event={event}
                  shareTitle={`${artist.name} - ${event.venue}`}
                />
              ))}
            </section>
          )}
        </div>

        <aside className="relative z-10 -mt-[140px] hidden w-72 shrink-0 flex-col gap-8 lg:flex">
          <div className="relative h-[374px] overflow-hidden rounded-2xl">
            <Image
              src={artist.cover}
              alt={artist.name}
              fill
              sizes="288px"
              className="object-cover"
            />
          </div>
          {mapVenue && <VenueMapCard address={formatVenueAddress(mapVenue)} />}
        </aside>
      </div>

      {nearbyEvents.length > 0 && (
        <EventShowcase
          title="Concert near you"
          events={toCardProps(nearbyEvents)}
        />
      )}
    </>
  );
}
