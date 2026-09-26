"use client";

import Button from "@/components/Button";
import EventShowcase from "@/components/EventShowcase";
import TagPill from "@/components/TagPill";
import {
  FIND_ARTIST_BY_SLUG,
  FindArtistBySlugData,
} from "@/graphql/queries/find-artist-by-slug";
import { toCardProps } from "@/lib/utils/card-props";
import { useQuery } from "@apollo/client/react";
import {
  AltArrowDownIcon,
  BookmarkIcon,
  CalendarIcon,
  ClockCircleIcon,
  MapPointIcon,
  ShareIcon,
} from "@solar-icons/react/outline";
import { Accordion } from "radix-ui";
import { format } from "date-fns";
import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

function PageMessage({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex flex-col items-start gap-6 px-27 pb-25">
        {children}
      </div>
    </>
  );
}

export default function Artist({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useQuery<FindArtistBySlugData>(
    FIND_ARTIST_BY_SLUG,
    {
      variables: {
        input: {
          slug,
        },
      },
    },
  );

  if (loading && !data) {
    return (
      <PageMessage>
        <p role="status" className="text-lg text-neutral-200">
          Loading artist…
        </p>
      </PageMessage>
    );
  }

  if (error) {
    return (
      <PageMessage>
        <div role="alert" className="flex flex-col items-start gap-6">
          <p className="text-2xl font-semibold">
            We couldn&apos;t load this artist.
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageMessage>
    );
  }

  const artist = data?.findArtistBySlug.artist;

  if (!artist) {
    return (
      <PageMessage>
        <h1 className="text-4xl font-bold">Artist not found</h1>
        <Link href="/events" className="text-primary hover:text-tint-400">
          Browse events
        </Link>
      </PageMessage>
    );
  }

  const eventsByCity = data.findArtistBySlug.eventsByCity ?? [];
  const nearbyEvents = data.findArtistBySlug.nearbyEvents;

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

      {eventsByCity.length === 0 ? (
        <p className="px-27 py-10 text-xl text-neutral-200">
          No upcoming dates
        </p>
      ) : (
        <Accordion.Root
          type="single"
          collapsible
          className="flex flex-col gap-4 px-27 lg:pr-96 mt-27 mb-12"
        >
          {eventsByCity.map((cityEvents) => (
            <Accordion.Item key={cityEvents.city} value="venue">
              <Accordion.Header>
                <Accordion.Trigger className="w-full">
                  <div className="flex justify-between items center w-full">
                    <span className="text-3xl font-semibold">
                      All days and times
                    </span>
                    <div className="flex items-center">
                      <MapPointIcon size={20} className="mr-2" />
                      <span className="mr-6 text-xl font-bold">
                        {cityEvents.city}, {cityEvents.country}
                      </span>
                      <AltArrowDownIcon />
                    </div>
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="py-4 flex flex-col gap-4">
                {cityEvents.events &&
                  cityEvents.events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-neutral-900 p-6 rounded-xl"
                    >
                      <div className="flex justify-between pb-5 mb-6 bg-[length:16px_1px] bg-bottom bg-repeat-x [background-image:linear-gradient(to_right,var(--color-neutral-300)_10px,transparent_10px)]">
                        <div className="flex gap-2 items-center">
                          <MapPointIcon size={20} className="text-primary" />
                          <span className="text-xl font-bold">
                            {event.venue} - {event.city}, {event.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <ShareIcon />
                          <BookmarkIcon />
                          <Button variant="outline" size="sm">
                            Get Tickets
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="ml-8 text-neutral-200">
                          <div className="flex items-center gap-1">
                            <CalendarIcon size={16} />
                            <span>{format(event.startAt, "d MMM - yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockCircleIcon size={16} />
                            <span>{format(event.startAt, "H:mm a")}</span>
                          </div>
                        </div>
                        {event.tags && (
                          <div className="flex gap-4">
                            {event.tags.map((tag) => (
                              <TagPill key={tag}>{tag}</TagPill>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
      <EventShowcase
        title="Concert near you"
        events={toCardProps(nearbyEvents ?? [])}
      />
    </>
  );
}
