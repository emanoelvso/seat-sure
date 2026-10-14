import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { paths } from "@/config/paths";
import { SeatMapPreview } from "@/features/tickets/components/seat-map";
import {
  TicketFacts,
  TicketTags,
  TicketTotals,
} from "@/features/tickets/components/ticket-summary";
import {
  SeatMapLayout,
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";

interface TicketDetailPanelProps {
  event: TicketsEvent;
  ticketType: TicketType;
  quantity: number;
  seatMap: SeatMapLayout;
  onBack: () => void;
}

export function TicketDetailPanel({
  event,
  ticketType,
  quantity,
  seatMap,
  onBack,
}: TicketDetailPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-6 rounded-2xl bg-neutral-800 px-4 py-6">
        <h2 className="text-2xl font-bold">Section {ticketType.name}</h2>

        <TicketTotals
          unitCents={ticketType.priceCents}
          totalCents={ticketType.priceCents * quantity}
          currency={ticketType.currency}
          quantity={quantity}
        />
        <TicketFacts event={event} quantity={quantity} />
        <TicketTags tags={ticketType.tags} />

        <div className="flex flex-col gap-3">
          <Link
            href={paths.eventSeats.getHref(event.id, ticketType.id, quantity)}
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
