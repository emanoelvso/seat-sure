"use client";

import {
  CalendarIcon,
  ClockCircleIcon,
  MapPointIcon,
  TicketIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";
import Link from "next/link";
import { KeyboardEvent, ReactNode, useEffect, useId, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { paths } from "@/config/paths";
import type {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import { TicketTags } from "@/features/tickets/components/ticket-summary";
import { formatPrice } from "@/utils/price";
import { byNumber } from "@/features/tickets/utils/seat-picks";
import {
  formatEventDate,
  formatEventLocation,
  formatEventTimeRange,
} from "@/utils/event-format";
import seatsIllustration from "../../../../public/tickets/seats-illustration.png";

interface ReviewSeatsDialogProps {
  open: boolean;
  /** Called once the dialog has closed: "Change Seat", Escape or `close()`. */
  onClose: () => void;
  eventId: string;
  ticketTypeId: string;
  event: Pick<
    TicketsEvent,
    "startAt" | "endsAt" | "venue" | "city" | "country"
  >;
  ticketType: Pick<TicketType, "currency" | "tags">;
  /** The picked seats, all in one row, in pick order. */
  pickedSeats: Seat[];
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{term}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

export function ReviewSeatsDialog({
  open,
  onClose,
  eventId,
  ticketTypeId,
  event,
  ticketType,
  pickedSeats,
}: ReviewSeatsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const { currency } = ticketType;
  const sorted = [...pickedSeats].sort(byNumber);
  const quantity = pickedSeats.length;
  // PAY-01: "Continue" hands off to checkout with the seats in pick order.
  const checkoutHref = paths.checkoutStart.getHref(
    eventId,
    ticketTypeId,
    pickedSeats.map((seat) => seat.id),
  );

  // The native modal gives the backdrop, the focus move and the inert page.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Escape closes through close(), like "Change Seat", so the close event
  // fires for any Escape key press, trusted or synthetic (Storybook tests).
  // preventDefault() keeps the browser from also handling it.
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="m-auto w-full max-w-[462px] rounded-2xl border-0 bg-neutral-700 p-8 text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-6">
        <div className="relative mx-auto">
          <span
            aria-hidden="true"
            className="absolute inset-x-6 inset-y-4 rounded-full bg-error-500/60 blur-2xl"
          />
          <Image src={seatsIllustration} alt="" className="relative" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <h2
            id={headingId}
            className="flex items-center gap-2 text-xl font-bold"
          >
            <MapPointIcon
              size={24}
              aria-hidden="true"
              className="shrink-0 text-tint-500"
            />
            Ticket Information
          </h2>
          <TicketTags tags={ticketType.tags} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-neutral-500 pb-6 text-neutral-100">
          <Fact icon={<TicketIcon size={20} className="shrink-0" />}>
            {quantity === 1 ? "1 ticket" : `${quantity} tickets together`}
          </Fact>
          <Fact icon={<CalendarIcon size={20} className="shrink-0" />}>
            {formatEventDate(event.startAt)}
          </Fact>
          <Fact icon={<MapPointIcon size={20} className="shrink-0" />}>
            {formatEventLocation(event)}
          </Fact>
          <Fact icon={<ClockCircleIcon size={20} className="shrink-0" />}>
            {formatEventTimeRange(event.startAt, event.endsAt)}
          </Fact>
        </div>

        <dl className="flex flex-col gap-2">
          <Line term="ROW" value={pickedSeats[0]?.row ?? "—"} />
          {sorted.map((seat) => (
            <Line
              key={seat.id}
              term={`Seat ${seat.number}`}
              value={formatPrice(seat.priceCents, currency)}
            />
          ))}
          <Line
            term="Total"
            value={formatPrice(
              pickedSeats.reduce((sum, seat) => sum + seat.priceCents, 0),
              currency,
            )}
          />
        </dl>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => dialogRef.current?.close()}>
            Change Seat
          </Button>
          <Link href={checkoutHref} className={buttonVariants()}>
            Continue
          </Link>
        </div>
      </div>
    </dialog>
  );
}
