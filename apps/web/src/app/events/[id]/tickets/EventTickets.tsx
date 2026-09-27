"use client";

import Button from "@/components/Button";
import Header from "@/components/Header";
import SeatListingCard from "@/components/SeatListingCard";
import SeatMap from "@/components/SeatMap";
import TicketsHero from "@/components/TicketsHero";
import {
  FIND_EVENT_TICKETS,
  FindEventTicketsData,
} from "@/graphql/queries/find-event-tickets";
import {
  defaultQuantity,
  filterListings,
  listingsLabel,
  priceBounds,
  quantityOptions,
  sortListings,
} from "@/lib/utils/ticket-listings";
import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { ReactNode, useState } from "react";

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

export default function EventTickets({ eventId }: { eventId: string }) {
  const [selectedId, setSelectedId] = useState<string>();

  const { data, loading, error, refetch } = useQuery<FindEventTicketsData>(
    FIND_EVENT_TICKETS,
    {
      variables: {
        input: {
          eventId,
        },
      },
    },
  );

  if (loading && !data) {
    return (
      <PageMessage>
        <p role="status" className="text-lg text-neutral-200">
          Loading tickets…
        </p>
      </PageMessage>
    );
  }

  if (error) {
    return (
      <PageMessage>
        <div role="alert" className="flex flex-col items-start gap-6">
          <p className="text-2xl font-semibold">
            We couldn&apos;t load tickets for this event.
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </PageMessage>
    );
  }

  const event = data?.findEventTickets.event;

  if (!event) {
    return (
      <PageMessage>
        <h1 className="text-4xl font-bold">Event not found</h1>
        <Link href="/events" className="text-primary hover:text-tint-400">
          Browse events
        </Link>
      </PageMessage>
    );
  }

  const { seatMap, ticketTypes } = data.findEventTickets;

  if (!seatMap) {
    return (
      <>
        <TicketsHero event={event} />
        <p className="px-27 pb-25 pt-10 text-xl text-neutral-200">
          Seat selection isn&apos;t available for this event.
        </p>
      </>
    );
  }

  const quantity = defaultQuantity(quantityOptions(ticketTypes));
  const price = priceBounds(ticketTypes);
  const listed = price
    ? sortListings(filterListings(ticketTypes, { quantity, price }), "desc")
    : [];
  const selected = listed.find((ticketType) => ticketType.id === selectedId);

  function selectSection(key: string) {
    const ticketType = listed.find((listing) => listing.sectionKey === key);
    if (ticketType) setSelectedId(ticketType.id);
  }

  return (
    <>
      <TicketsHero event={event} selected={selected} />

      <div className="flex flex-col gap-6 px-27 pb-25 pt-10 lg:flex-row">
        <div className="flex min-w-0 flex-col gap-6 lg:w-[808px] lg:shrink-0">
          <h2 className="border-b border-neutral-700 pb-4 text-xl">Filters</h2>
          <SeatMap
            layout={seatMap}
            enabledKeys={listed.map((ticketType) => ticketType.sectionKey)}
            selectedKey={selected?.sectionKey}
            onSelect={selectSection}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[392px]">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-800 px-4 py-2.5">
            <span>{listingsLabel(listed.length)}</span>
          </div>
          {listed.length > 0 ? (
            <ul aria-label="Listings" className="flex flex-col gap-4">
              {listed.map((ticketType) => (
                <li key={ticketType.id}>
                  <SeatListingCard
                    ticketType={ticketType}
                    quantity={quantity}
                    selected={ticketType.id === selected?.id}
                    onSelect={() => setSelectedId(ticketType.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-200">No listings match your filters</p>
          )}
        </div>
      </div>
    </>
  );
}
