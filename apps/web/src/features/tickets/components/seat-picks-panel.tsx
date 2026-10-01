import { ChairIcon } from "@solar-icons/react/outline";
import { Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  TicketFacts,
  TicketTags,
  TicketTotals,
} from "@/features/tickets/components/ticket-summary";
import { byNumber } from "@/features/tickets/utils/seat-picks";

interface SeatPicksPanelProps {
  event: Pick<TicketsEvent, "startAt" | "endsAt">;
  ticketType: Pick<TicketType, "name" | "priceCents" | "currency" | "tags">;
  quantity: number;
  /** The picked seats, all in one row. */
  pickedSeats: Seat[];
  onContinue: () => void;
  /** The page focuses Continue through it when the review dialog closes. */
  continueRef?: Ref<HTMLButtonElement>;
}

export function SeatPicksPanel({
  event,
  ticketType,
  quantity,
  pickedSeats,
  onContinue,
  continueRef,
}: SeatPicksPanelProps) {
  const sorted = [...pickedSeats].sort(byNumber);

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-neutral-800 px-4 py-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <ChairIcon size={24} aria-hidden="true" className="shrink-0" />
        Section {ticketType.name}
      </h2>

      <TicketTotals ticketType={ticketType} quantity={quantity} />

      <div className="flex items-center justify-between gap-4 text-neutral-100">
        <span className="flex items-center gap-2">
          <ChairIcon size={20} aria-hidden="true" className="shrink-0" />
          Row{" "}
          <span className="font-bold text-white">
            {pickedSeats[0]?.row ?? "—"}
          </span>
        </span>
        {sorted.length > 0 && (
          <ul
            aria-label="Picked seats"
            className="flex flex-wrap justify-end gap-4 text-sm text-neutral-200"
          >
            {sorted.map((seat) => (
              <li key={seat.id}>{seat.number}</li>
            ))}
          </ul>
        )}
      </div>

      <TicketFacts event={event} quantity={quantity} />
      <TicketTags tags={ticketType.tags} />

      <button
        ref={continueRef}
        type="button"
        disabled={pickedSeats.length < quantity}
        onClick={onContinue}
        className={buttonVariants({ size: "lg" })}
      >
        Continue
      </button>
    </section>
  );
}
