import { notFound } from "next/navigation";
import { Footer } from "@/components/layouts/footer";
import { getEventTickets } from "@/features/tickets/api/get-event-tickets";
import { EventTicketsView } from "@/features/tickets/components/event-tickets-view";

export default async function EventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventTickets = await getEventTickets(id);

  if (!eventTickets.event) notFound();

  return (
    <>
      <main>
        <EventTicketsView eventTickets={eventTickets} />
      </main>
      <Footer />
    </>
  );
}
