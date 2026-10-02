"use client";

import { useQueryStates } from "nuqs";
import { useRef, useState } from "react";
import { PillSelect } from "@/components/ui/pill-select";
import type {
  FindTicketTypeSeats,
  Seat,
} from "@/features/tickets/api/find-ticket-type-seats";
import { ReviewSeatsDialog } from "@/features/tickets/components/review-seats-dialog";
import { SeatChart } from "@/features/tickets/components/seat-chart";
import { SeatLegend } from "@/features/tickets/components/seat-legend";
import { SeatMapPreview } from "@/features/tickets/components/seat-map";
import { SeatPicksPanel } from "@/features/tickets/components/seat-picks-panel";
import { TicketsHero } from "@/features/tickets/components/tickets-hero";
import {
  latestPick,
  pickSeat,
  resolveSeatQuantity,
  seatNotice,
  trimPicks,
} from "@/features/tickets/utils/seat-picks";
import { seatsParsers } from "@/features/tickets/utils/seats-search-params";

function ticketsOptionLabel(quantity: number) {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets`;
}

interface EventSeatsViewProps {
  ticketTypeSeats: FindTicketTypeSeats;
  unavailableSeatIds: string[];
}

export function EventSeatsView({
  ticketTypeSeats,
  unavailableSeatIds,
}: EventSeatsViewProps) {
  const [urlState, setUrlState] = useQueryStates(seatsParsers, {
    history: "replace",
  });
  // Seat ids in pick order, earliest first. Picks hold no seat, so they stay
  // out of the URL.
  const [picks, setPicks] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);

  // The page already called notFound() when event is null, and the API only
  // returns an event with its ticket type.
  const event = ticketTypeSeats.event!;
  const ticketType = ticketTypeSeats.ticketType!;
  const { seatMap, seats } = ticketTypeSeats;

  if (!seatMap || seats.length === 0) {
    return (
      <>
        <TicketsHero event={event} selected={ticketType} />
        <p className="px-27 pb-25 pt-10 text-xl text-neutral-200">
          Seat selection isn&apos;t available for this section.
        </p>
      </>
    );
  }

  const quantity = resolveSeatQuantity(
    urlState.quantity,
    ticketType.maxPerOrder,
  );
  const options = Array.from(
    { length: ticketType.maxPerOrder },
    (_, index) => index + 1,
  );
  const unavailableIds = new Set(unavailableSeatIds);
  const notice = seatNotice(seats, unavailableIds, quantity);
  const pickedSeats = seats.filter((seat) => picks.includes(seat.id));

  function pick(seat: Seat) {
    setPicks((current) => pickSeat(current, seat, seats, quantity));
  }

  // The picks are trimmed in the same handler, so they never exceed the new
  // quantity (SEAT-38).
  function changeQuantity(value: string) {
    const nextQuantity = Number(value);
    setUrlState({ quantity: nextQuantity });
    setPicks((current) => trimPicks(current, nextQuantity));
  }

  // Focus goes back to Continue explicitly, whatever element the browser
  // restores when the dialog closes (SEAT-46).
  function closeReview() {
    setReviewing(false);
    continueRef.current?.focus();
  }

  return (
    <>
      <TicketsHero
        event={event}
        selected={ticketType}
        seat={latestPick(picks, seats)}
      />

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
          </div>
          {notice && <p className="text-lg text-neutral-200">{notice}</p>}
          <div className="mt-18">
            <SeatChart
              seats={seats}
              unavailableIds={unavailableIds}
              pickedIds={picks}
              ticketType={ticketType}
              onPick={pick}
            />
          </div>
          <div className="mt-9 w-full max-w-[700px] lg:ml-5">
            <SeatLegend />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[392px]">
          <SeatPicksPanel
            event={event}
            ticketType={ticketType}
            quantity={quantity}
            pickedSeats={pickedSeats}
            onContinue={() => setReviewing(true)}
            continueRef={continueRef}
          />
          <div className="rounded-2xl bg-neutral-800 p-4">
            <SeatMapPreview
              layout={seatMap}
              highlightKey={ticketType.sectionKey}
            />
          </div>
        </div>
      </div>

      <ReviewSeatsDialog
        open={reviewing}
        onClose={closeReview}
        event={event}
        ticketType={ticketType}
        pickedSeats={pickedSeats}
      />
    </>
  );
}
