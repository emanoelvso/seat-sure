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

export default function Artist({ slug }: { slug: string }) {
  const { data } = useQuery<FindArtistBySlugData>(FIND_ARTIST_BY_SLUG, {
    variables: {
      input: {
        slug,
      },
    },
  });

  const artist = data?.findArtistBySlug.artist;
  const eventsByCity = data?.findArtistBySlug.eventsByCity;
  const nearbyEvents = data?.findArtistBySlug.nearbyEvents;

  return (
    <>
      <div className="relative">
        <section
          aria-label="Artist = hero"
          className="relative min-h-[720px] overflow-hidden flex flex-col"
        >
          {artist?.cover && (
            <div className="absolute inset-0 z-0">
              <Image
                src={artist.cover}
                alt={artist.name}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
            </div>
          )}

          <Header transparent />

          <div className="relative z-10 px-27 mt-auto flex flex-col gap-4 max-w-3xl">
            <h1 className="text-6xl font-bold">{artist?.name}</h1>
            <p className="text-lg font-medium">{artist?.bio}</p>
          </div>
        </section>

        {artist?.cover && (
          <div className="rounded-2xl pointer-events-none absolute right-10 top-96 z-20 hidden lg:block w-72 h-[520px] rounded-l2exl overflow-hidden shadow-2xl">
            <Image
              src={artist.cover}
              alt={artist.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        <Accordion.Root
          type="single"
          collapsible
          className="flex flex-col gap-4 px-27 lg:pr-96 mt-27 mb-12"
        >
          {eventsByCity?.map((cityEvents) => (
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
      </div>
      <EventShowcase
        title="Concert near you"
        events={toCardProps(nearbyEvents ?? [])}
      />
    </>
  );
}
