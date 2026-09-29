import {
  CalendarIcon,
  ClockCircleIcon,
  TicketIcon,
} from "@solar-icons/react/outline";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { SeatMapPreview } from "@/components/SeatMap";
import { TagPill } from "@/components/ui/tag-pill";
import {
  GqlSeatMap,
  GqlTicketsEvent,
  GqlTicketType,
} from "@/graphql/queries/find-event-tickets";
import {
  formatEventDate,
  formatEventTimeRange,
} from "@/lib/utils/event-format";
import { formatPrice } from "@/lib/utils/price";

interface TicketDetailPanelProps {
  event: GqlTicketsEvent;
  ticketType: GqlTicketType;
  quantity: number;
  seatMap: GqlSeatMap;
  onBack: () => void;
}

function quantityLine(quantity: number) {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets together`;
}

export function TicketDetailPanel({
  event,
  ticketType,
  quantity,
  seatMap,
  onBack,
}: TicketDetailPanelProps) {
  const { priceCents, currency } = ticketType;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-6 rounded-2xl bg-neutral-800 px-4 py-6">
        <h2 className="text-2xl font-bold">Section {ticketType.name}</h2>

        <dl className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-100">Price</dt>
            <dd className="text-primary">
              <span className="text-2xl font-bold">
                {formatPrice(priceCents, currency)}
              </span>
              <span className="text-sm">/per</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-100">Tickets</dt>
            <dd className="text-xl font-bold">{quantity}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-neutral-700 pt-3">
            <dt className="text-neutral-100">Total</dt>
            <dd className="text-2xl font-bold">
              {formatPrice(priceCents * quantity, currency)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 text-neutral-100">
          <span className="flex items-center gap-2">
            <TicketIcon size={20} className="shrink-0" />
            {quantityLine(quantity)}
          </span>
          <span className="flex items-center gap-2">
            <CalendarIcon size={20} className="shrink-0" />
            {formatEventDate(event.startAt)}
          </span>
          <span className="flex items-center gap-2">
            <ClockCircleIcon size={20} className="shrink-0" />
            {formatEventTimeRange(event.startAt, event.endsAt)}
          </span>
        </div>

        {ticketType.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap gap-2">
            {ticketType.tags.map((tag) => (
              <li key={tag}>
                <TagPill size="xs">{tag}</TagPill>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href={`/events/${event.id}/tickets/${ticketType.id}?quantity=${quantity}`}
            className={buttonVariants({ size: "lg" })}
          >
            Get a Ticket
          </Link>
          <Button variant="outline" size="lg" onClick={onBack}>
            Back to listings
          </Button>
        </div>
      </section>

      <div className="rounded-2xl bg-neutral-800 p-4">
        <SeatMapPreview layout={seatMap} highlightKey={ticketType.sectionKey} />
      </div>
    </div>
  );
}
