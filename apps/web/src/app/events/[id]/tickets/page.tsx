import Footer from "@/components/Footer";
import EventTickets from "./EventTickets";

export default async function EventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <main>
        <EventTickets eventId={id} />
      </main>
      <Footer />
    </>
  );
}
