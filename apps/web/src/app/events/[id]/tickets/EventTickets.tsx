"use client";

import Button from "@/components/Button";
import Header from "@/components/Header";
import PillSelect from "@/components/PillSelect";
import PriceRangeFilter from "@/components/PriceRangeFilter";
import SeatListingCard from "@/components/SeatListingCard";
import SeatMap from "@/components/SeatMap";
import SortSelect, { SortOrder } from "@/components/SortSelect";
import TicketsHero from "@/components/TicketsHero";
import { TicketDetailPanel } from "@/features/tickets/components/ticket-detail-panel";
import {
  FIND_EVENT_TICKETS,
  FindEventTicketsData,
  GqlTicketType,
} from "@/graphql/queries/find-event-tickets";
import {
  defaultQuantity,
  filterListings,
  listingsLabel,
  narrowListings,
  PriceRange,
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

interface Filters {
  quantity: number;
  price: PriceRange | null;
}

function ticketsOptionLabel(quantity: number) {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets`;
}

export default function EventTickets({ eventId }: { eventId: string }) {
  const [quantityChoice, setQuantityChoice] = useState<number>();
  const [priceChoice, setPriceChoice] = useState<PriceRange>();
  const [sort, setSort] = useState<SortOrder>("desc");
  const [pressedKey, setPressedKey] = useState<string>();
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

  const options = quantityOptions(ticketTypes);
  const quantity = quantityChoice ?? defaultQuantity(options);
  const price = priceChoice ?? priceBounds(ticketTypes);

  const qualifyingFor = (filters: Filters) =>
    filters.price
      ? filterListings(ticketTypes, { ...filters, price: filters.price })
      : [];

  const qualifying = sortListings(qualifyingFor({ quantity, price }), sort);
  const listed = narrowListings(qualifying, pressedKey);
  const selected = listed.find((ticketType) => ticketType.id === selectedId);
  const offers = Object.fromEntries(
    qualifying.map((ticketType) => [ticketType.sectionKey, ticketType]),
  );

  // The pressed section and the selection are cleared in the same handler
  // that hides them, so relaxing a filter never brings them back (SECT-30).
  function clearSelectionIfHidden(nextListed: GqlTicketType[]) {
    if (!nextListed.some((ticketType) => ticketType.id === selectedId)) {
      setSelectedId(undefined);
    }
  }

  function applyFilters(next: Filters) {
    const nextQualifying = qualifyingFor(next);
    const nextPressedKey = nextQualifying.some(
      (ticketType) => ticketType.sectionKey === pressedKey,
    )
      ? pressedKey
      : undefined;

    setPressedKey(nextPressedKey);
    clearSelectionIfHidden(narrowListings(nextQualifying, nextPressedKey));
  }

  function changeQuantity(value: string) {
    const nextQuantity = Number(value);
    setQuantityChoice(nextQuantity);
    applyFilters({ quantity: nextQuantity, price });
  }

  function changePrice(range: PriceRange) {
    setPriceChoice(range);
    applyFilters({ quantity, price: range });
  }

  function pressSection(key: string) {
    const nextPressedKey = key === pressedKey ? undefined : key;
    setPressedKey(nextPressedKey);
    clearSelectionIfHidden(narrowListings(qualifying, nextPressedKey));
  }

  return (
    <>
      <TicketsHero event={event} selected={selected} />

      <div className="flex flex-col gap-6 px-27 pb-25 pt-10 lg:flex-row">
        <div className="flex min-w-0 flex-col gap-6 lg:w-[808px] lg:shrink-0">
          <h2 className="border-b border-neutral-700 pb-4 text-xl">Filters</h2>
          <div className="flex flex-wrap gap-2">
            <PillSelect
              label="Tickets"
              variant="active"
              value={String(quantity)}
              options={options.map((option) => ({
                value: String(option),
                label: ticketsOptionLabel(option),
              }))}
              onChange={changeQuantity}
            />
            {price && <PriceRangeFilter value={price} onApply={changePrice} />}
          </div>
          <SeatMap
            layout={seatMap}
            enabledKeys={qualifying.map((ticketType) => ticketType.sectionKey)}
            selectedKey={pressedKey}
            onSelect={pressSection}
            offers={offers}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[392px]">
          {selected ? (
            <TicketDetailPanel
              event={event}
              ticketType={selected}
              quantity={quantity}
              seatMap={seatMap}
              onBack={() => setSelectedId(undefined)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-800 px-4 py-2.5">
                <span>{listingsLabel(listed.length)}</span>
                <SortSelect value={sort} onChange={setSort} />
              </div>
              {listed.length > 0 ? (
                <ul aria-label="Listings" className="flex flex-col gap-4">
                  {listed.map((ticketType) => (
                    <li key={ticketType.id}>
                      <SeatListingCard
                        ticketType={ticketType}
                        quantity={quantity}
                        selected={false}
                        onSelect={() => setSelectedId(ticketType.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-neutral-200">
                  No listings match your filters
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
