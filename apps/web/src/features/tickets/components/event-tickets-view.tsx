"use client";

import { PillSelect } from "@/components/ui/pill-select";
import { PriceRangeFilter } from "@/features/tickets/components/price-range-filter";
import { SeatListingCard } from "@/features/tickets/components/seat-listing-card";
import { SeatMap } from "@/features/tickets/components/seat-map";
import { SortSelect } from "@/components/ui/sort-select";
import { TicketsHero } from "@/features/tickets/components/tickets-hero";
import { TicketDetailPanel } from "@/features/tickets/components/ticket-detail-panel";
import {
  FindEventTickets,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import {
  filterListings,
  listingsLabel,
  narrowListings,
  PriceRange,
  quantityOptions,
  resolveTicketFilters,
  sortListings,
} from "@/features/tickets/utils/ticket-listings";
import { ticketsParsers } from "@/features/tickets/utils/tickets-search-params";
import { useQueryStates } from "nuqs";
import { useState } from "react";

interface Filters {
  quantity: number;
  price: PriceRange | null;
}

function ticketsOptionLabel(quantity: number) {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets`;
}

export function EventTicketsView({
  eventTickets,
}: {
  eventTickets: FindEventTickets;
}) {
  // Shallow: the filters are applied to props, with no server request (MIG-47).
  const [urlFilters, setUrlFilters] = useQueryStates(ticketsParsers, {
    history: "replace",
  });
  const [pressedKey, setPressedKey] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();

  // The page already called notFound() when event is null.
  const event = eventTickets.event!;
  const { seatMap, ticketTypes } = eventTickets;

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
  const { quantity, price } = resolveTicketFilters(urlFilters, ticketTypes);
  const { sort } = urlFilters;

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
  function clearSelectionIfHidden(nextListed: TicketType[]) {
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
    setUrlFilters({ quantity: nextQuantity });
    applyFilters({ quantity: nextQuantity, price });
  }

  function changePrice(range: PriceRange) {
    setUrlFilters({ min: range.min, max: range.max });
    applyFilters({ quantity, price: range });
  }

  function pressSection(key: string) {
    const nextPressedKey = key === pressedKey ? undefined : key;
    setPressedKey(nextPressedKey);
    clearSelectionIfHidden(narrowListings(qualifying, nextPressedKey));
  }

  return (
    <>
      <TicketsHero
        event={event}
        selected={selected}
        price={
          selected && {
            cents: selected.priceCents,
            from: selected.maxPriceCents > selected.priceCents,
          }
        }
      />

      <div className="flex flex-col justify-between gap-6 px-27 pb-25 pt-10 lg:flex-row">
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
                <SortSelect
                  value={sort}
                  onChange={(next) => setUrlFilters({ sort: next })}
                />
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
