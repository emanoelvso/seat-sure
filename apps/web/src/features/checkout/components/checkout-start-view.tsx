import { paths } from "@/config/paths";
import type {
  StartCheckoutActionInput,
  StartCheckoutState,
} from "@/features/checkout/api/start-checkout-action";
import { CheckoutEventCard } from "@/features/checkout/components/checkout-event-card";
import { CheckoutSteps } from "@/features/checkout/components/checkout-steps";
import { CountdownTimer } from "@/features/checkout/components/countdown-timer";
import { FanProtectCard } from "@/features/checkout/components/fan-protect-card";
import { LockedPriceDialog } from "@/features/checkout/components/locked-price-dialog";
import { TicketsStep } from "@/features/checkout/components/tickets-step";

type StartAction = (
  state: StartCheckoutState,
  payload: StartCheckoutActionInput,
) => Promise<StartCheckoutState>;

interface CheckoutStartViewEvent {
  id: string;
  name: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
}

interface CheckoutStartViewTicketType {
  id: string;
  name: string;
}

interface CheckoutStartViewSeat {
  id: string;
  row: string;
  number: string;
}

interface CheckoutStartViewProps {
  event: CheckoutStartViewEvent;
  ticketType: CheckoutStartViewTicketType;
  /** The picked seats, in pick order. */
  seats: CheckoutStartViewSeat[];
  startAction: StartAction;
}

// PAY-04, PAY-17: the /checkout start page. The quantity and price are fixed
// by the picked seats, so the Tickets step is read-only and "Confirm" is
// inert behind the LockedPriceDialog - the only way out is "Start" or
// "Choose seats".
export function CheckoutStartView({
  event,
  ticketType,
  seats,
  startAction,
}: CheckoutStartViewProps) {
  const quantity = seats.length;
  const seatsHref = paths.eventSeats.getHref(event.id, ticketType.id, quantity);

  return (
    <div className="flex flex-col gap-12">
      <div className="mx-auto w-full max-w-[704px]">
        <CheckoutSteps current="tickets" />
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,508px)_minmax(0,600px)] lg:justify-between">
        <CheckoutEventCard
          event={event}
          ticketTypeName={ticketType.name}
          items={seats}
        />

        <div className="flex flex-col gap-8">
          <CountdownTimer secondsLeft={600} running={false} />
          <TicketsStep quantity={quantity} confirmDisabled />
          <FanProtectCard />
        </div>
      </div>

      <LockedPriceDialog
        startAction={startAction}
        payload={{
          eventId: event.id,
          ticketTypeId: ticketType.id,
          seatIds: seats.map((seat) => seat.id),
        }}
        seatsHref={seatsHref}
      />
    </div>
  );
}
