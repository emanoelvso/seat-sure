import {
  CalendarIcon,
  ClockCircleIcon,
  TicketIcon,
} from "@solar-icons/react/outline";
import { TagPill } from "@/components/ui/tag-pill";
import {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import {
  formatEventDate,
  formatEventTimeRange,
} from "@/utils/event-format";
import { formatPrice } from "@/utils/price";

// The parts of a ticket summary shared by the section detail panel and the
// seat picks panel.

function quantityLine(quantity: number) {
  return quantity === 1 ? "1 ticket" : `${quantity} tickets together`;
}

export function TicketTotals({
  ticketType,
  quantity,
}: {
  ticketType: Pick<TicketType, "priceCents" | "currency">;
  quantity: number;
}) {
  const { priceCents, currency } = ticketType;

  return (
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
  );
}

export function TicketFacts({
  event,
  quantity,
}: {
  event: Pick<TicketsEvent, "startAt" | "endsAt">;
  quantity: number;
}) {
  return (
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
  );
}

export function TicketTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag}>
          <TagPill size="xs">{tag}</TagPill>
        </li>
      ))}
    </ul>
  );
}
