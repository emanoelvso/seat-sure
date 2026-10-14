import {
  CalendarIcon,
  ClockCircleIcon,
  HeartIcon,
  MapPointIcon,
  TicketIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layouts/header";
import { ShareButton } from "@/components/ui/share-button";
import { paths } from "@/config/paths";
import {
  formatEventDate,
  formatEventLocation,
  formatEventTimeRange,
} from "@/utils/event-format";
import { formatPrice } from "@/utils/price";
import {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";

interface TicketsHeroProps {
  event: TicketsEvent;
  selected?: TicketType;
  /** The seat page's latest pick, shown as ROW and SEAT. */
  seat?: { row: string; number: string };
  /** Overrides the selected type's price, e.g. "From" on the listing page. */
  price?: { cents: number; from: boolean };
  /** Shown for an empty SEC, ROW or SEAT. The seat page passes "?". */
  emptyValue?: string;
}

const PLACEHOLDER = "—";

function SeatDetail({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-neutral-100">{label}</span>
      <span data-testid={testId} className="text-[22px] font-bold">
        {value}
      </span>
    </div>
  );
}

function heroPrice(
  selected: TicketType | undefined,
  price: TicketsHeroProps["price"],
): string {
  if (!selected) return PLACEHOLDER;

  const cents = price?.cents ?? selected.priceCents;

  return `${price?.from ? "From " : ""}${formatPrice(cents, selected.currency)}`;
}

export function TicketsHero({
  event,
  selected,
  seat,
  price,
  emptyValue = PLACEHOLDER,
}: TicketsHeroProps) {
  return (
    <section
      aria-label={`${event.name} tickets`}
      className="relative flex h-[460px] flex-col overflow-hidden"
    >
      <Image
        src={event.coverImage}
        alt=""
        fill
        fetchPriority="high"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />

      <Header transparent />

      <div className="absolute right-27 top-[181px] z-10 flex w-[600px] flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <h1
            className={`text-5xl font-bold ${event.type === "concert" ? "uppercase tracking-[0.34em]" : ""}`}
          >
            {event.headliner ? (
              <Link href={paths.artist.getHref(event.headliner.slug)}>
                {event.name}
              </Link>
            ) : (
              event.name
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-4">
            <span aria-hidden="true" data-testid="heart-icon" className="flex">
              <HeartIcon size={24} />
            </span>
            <ShareButton title={`${event.name} - ${event.venue}`} />
          </div>
        </div>

        <div className="flex justify-between gap-6 text-lg text-neutral-100">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2">
              <CalendarIcon size={24} />
              {formatEventDate(event.startAt)}
            </span>
            <span className="flex items-center gap-2">
              <MapPointIcon size={24} className="shrink-0" />
              <span className="w-[230px] truncate">
                {formatEventLocation(event)}
              </span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="flex items-center gap-2">
              <ClockCircleIcon size={24} />
              {formatEventTimeRange(event.startAt, event.endsAt)}
            </span>
            <span className="flex items-center gap-2">
              <TicketIcon size={24} />
              <span
                data-testid="hero-price"
                className="text-[22px] font-bold text-white"
              >
                {heroPrice(selected, price)}
              </span>
              /Person
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <SeatDetail
            label="SEC"
            value={selected?.name ?? emptyValue}
            testId="hero-sec"
          />
          <span aria-hidden="true" className="h-[50px] w-px bg-neutral-500" />
          <SeatDetail
            label="ROW"
            value={seat?.row ?? emptyValue}
            testId="hero-row"
          />
          <span aria-hidden="true" className="h-[50px] w-px bg-neutral-500" />
          <SeatDetail
            label="SEAT"
            value={seat?.number ?? emptyValue}
            testId="hero-seat"
          />
        </div>
      </div>
    </section>
  );
}
