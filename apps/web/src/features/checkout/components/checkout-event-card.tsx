import Image from "next/image";
import { formatEventDay, formatEventTime } from "@/utils/event-format";
import {
  seatsLabel,
  ticketCountLine,
} from "@/features/checkout/utils/checkout-format";

interface CheckoutEvent {
  name: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
}

interface CheckoutEventCardItem {
  row: string;
  number: string;
}

interface CheckoutEventCardProps {
  event: CheckoutEvent;
  ticketTypeName: string;
  items: CheckoutEventCardItem[];
}

// PAY-21: the left event card shown through every checkout step.
export function CheckoutEventCard({
  event,
  ticketTypeName,
  items,
}: CheckoutEventCardProps) {
  const row = items[0]?.row ?? "";

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-neutral-500">
      <div className="relative h-[336px] w-full">
        <Image
          src={event.coverImage}
          alt=""
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1 bg-neutral-800 p-4 text-sm text-neutral-200">
        <h2 className="text-lg font-bold text-white">{event.name}</h2>
        <p>
          {formatEventDay(event.startAt)} • {formatEventTime(event.startAt)}
        </p>
        <p>{event.venue}</p>
        <p>
          {event.city}, {event.country}
        </p>
        <p className="font-bold text-white">
          Section {ticketTypeName} • Row {row} • {seatsLabel(items)}
        </p>
        <p className="font-bold text-success-400">
          {ticketCountLine(items.length)}
        </p>
      </div>
    </div>
  );
}
