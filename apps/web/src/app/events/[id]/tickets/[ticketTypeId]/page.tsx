import { notFound } from "next/navigation";
import { Footer } from "@/components/layouts/footer";
import { getEventSeats } from "@/features/tickets/api/get-event-seats";
import { EventSeatsView } from "@/features/tickets/components/event-seats-view";

// No loading.tsx: the page awaits its data so notFound() still answers 404
// (AD-008). The tickets route's error.tsx and not-found.tsx cover this segment.
export default async function EventSeatsPage({
  params,
}: {
  params: Promise<{ id: string; ticketTypeId: string }>;
}) {
  const { id, ticketTypeId } = await params;
  const { ticketTypeSeats, unavailableSeatIds } = await getEventSeats(
    id,
    ticketTypeId,
  );

  if (!ticketTypeSeats.event) notFound();

  return (
    <>
      <main>
        <EventSeatsView
          ticketTypeSeats={ticketTypeSeats}
          unavailableSeatIds={unavailableSeatIds}
        />
      </main>
      <Footer />
    </>
  );
}
