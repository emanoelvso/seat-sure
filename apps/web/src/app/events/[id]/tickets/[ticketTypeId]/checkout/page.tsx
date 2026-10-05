import { notFound, redirect } from "next/navigation";
import { paths } from "@/config/paths";
import { hasSession } from "@/features/auth/api/session-cookies";
import { startCheckoutAction } from "@/features/checkout/api/start-checkout-action";
import { CheckoutStartView } from "@/features/checkout/components/checkout-start-view";
import { FIND_TICKET_TYPE_SEATS } from "@/features/tickets/api/find-ticket-type-seats";
import { graphqlServerFetch } from "@/lib/graphql-server";

// Comma-separated, trimmed, distinct ids, 1..maxPerOrder are checked by the
// caller. `null` means the shape itself is invalid (missing, blank, or
// duplicate ids) - the caller answers 404 (PAY-05).
function parseSeatIds(raw: string | undefined): string[] | null {
  if (!raw) return null;

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

  if (ids.length === 0) return null;
  if (new Set(ids).size !== ids.length) return null;

  return ids;
}

// No loading.tsx: the page awaits its data so notFound() still answers 404
// (AD-008). This segment's error.tsx and not-found.tsx cover it.
export default async function CheckoutStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; ticketTypeId: string }>;
  searchParams: Promise<{ seats?: string }>;
}) {
  const { id: eventId, ticketTypeId } = await params;
  const { seats: seatsParam } = await searchParams;

  // PAY-03: a signed-out fan is sent to /login with this URL (seats as
  // given) as the return path.
  if (!(await hasSession())) {
    redirect(
      paths.login.getHref(
        paths.checkoutStart.getHref(
          eventId,
          ticketTypeId,
          seatsParam ? seatsParam.split(",") : [],
        ),
      ),
    );
  }

  const seatIds = parseSeatIds(seatsParam);
  if (!seatIds) notFound();

  const { findTicketTypeSeats } = await graphqlServerFetch(
    FIND_TICKET_TYPE_SEATS,
    { input: { eventId, ticketTypeId } },
    { tags: [`event:${eventId}`] },
  );

  if (!findTicketTypeSeats.event || !findTicketTypeSeats.ticketType) {
    notFound();
  }

  const { event, ticketType, seats } = findTicketTypeSeats;
  if (seatIds.length > ticketType.maxPerOrder) notFound();

  const seatsById = new Map(seats.map((seat) => [seat.id, seat]));
  const pickedSeats = seatIds.map((id) => seatsById.get(id));
  if (pickedSeats.some((seat) => seat === undefined)) notFound();

  return (
    <CheckoutStartView
      event={event}
      ticketType={ticketType}
      seats={pickedSeats as NonNullable<(typeof pickedSeats)[number]>[]}
      startAction={startCheckoutAction}
    />
  );
}
