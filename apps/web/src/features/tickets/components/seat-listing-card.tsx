import { ChairIcon, TicketIcon } from "@solar-icons/react/outline";
import { useId } from "react";
import { TagPill } from "@/components/ui/tag-pill";
import { formatPrice } from "@/features/tickets/utils/price";
import { GqlTicketType } from "@/features/tickets/api/find-event-tickets";
import { quantityLabel } from "@/features/tickets/utils/ticket-listings";

interface SeatListingCardProps {
  ticketType: GqlTicketType;
  quantity: number;
  selected: boolean;
  onSelect: () => void;
}

export function SeatListingCard({
  ticketType,
  quantity,
  selected,
  onSelect,
}: SeatListingCardProps) {
  const id = useId();
  const hasTags = ticketType.tags.length > 0;
  const describedBy = [`${id}-row`, `${id}-price`, `${id}-quantity`]
    .concat(hasTags ? `${id}-tags` : [])
    .join(" ");

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-labelledby={`${id}-title`}
      aria-describedby={describedBy}
      onClick={onSelect}
      className={`flex w-full cursor-pointer flex-col gap-4 rounded-2xl border bg-neutral-800 px-4 py-6 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-tint-400 ${selected ? "border-primary" : "border-transparent hover:border-neutral-500"}`}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="flex items-center gap-2">
          <ChairIcon size={24} className="shrink-0" />
          <span id={`${id}-title`} className="text-xl font-bold">
            Section {ticketType.name}
          </span>
          <span id={`${id}-row`} className="text-neutral-100">
            Row —
          </span>
        </span>
        <span id={`${id}-price`} className="shrink-0 text-primary">
          <span className="text-2xl font-bold">
            {formatPrice(ticketType.priceCents, ticketType.currency)}
          </span>
          <span className="text-sm">/per</span>
        </span>
      </span>

      <span className="flex items-center gap-2">
        <TicketIcon size={20} className="shrink-0" />
        <span id={`${id}-quantity`}>{quantityLabel(quantity)}</span>
      </span>

      {hasTags && (
        <span
          id={`${id}-tags`}
          data-testid="tags"
          className="flex flex-wrap gap-2"
        >
          {ticketType.tags.map((tag) => (
            <TagPill key={tag} size="xs">
              {tag}
            </TagPill>
          ))}
        </span>
      )}
    </button>
  );
}
