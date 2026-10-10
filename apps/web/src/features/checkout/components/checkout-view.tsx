"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useCallback,
  useState,
} from "react";
import { paths } from "@/config/paths";
import type {
  PayOrderActionInput,
  PayOrderState,
} from "@/features/checkout/api/pay-order-action";
import { CardForm } from "@/features/checkout/components/card-form";
import { CheckoutEventCard } from "@/features/checkout/components/checkout-event-card";
import {
  CheckoutSteps,
  type CheckoutStep,
} from "@/features/checkout/components/checkout-steps";
import { CountdownTimer } from "@/features/checkout/components/countdown-timer";
import { FanProtectCard } from "@/features/checkout/components/fan-protect-card";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { ReviewStep } from "@/features/checkout/components/review-step";
import { TicketsStep } from "@/features/checkout/components/tickets-step";
import { TimeOutDialog } from "@/features/checkout/components/time-out-dialog";
import {
  normalizeNumber,
  type CardFieldErrors,
  type CardInput,
} from "@/features/checkout/utils/card";
import type { CheckoutOrderStatus } from "@/types/__generated__/graphql";
import { formatPrice } from "@/utils/price";

type PayAction = (
  state: PayOrderState,
  input: PayOrderActionInput,
) => Promise<PayOrderState>;

interface CheckoutViewProps {
  order: {
    id: string;
    status: CheckoutOrderStatus;
    secondsLeft: number;
    quantity: number;
    currency: string;
    totalCents: number;
    unitPriceCents: number;
    unitServiceFeeCents: number;
    unitTaxCents: number;
    event: {
      id: string;
      name: string;
      coverImage: string;
      venue: string;
      city: string;
      country: string;
      startAt: string;
    };
    ticketType: { id: string; name: string };
    items: { row: string; number: string }[];
  };
  user: { firstName: string; lastName: string; email: string };
  payAction: PayAction;
}

const emptyCard: CardInput = { number: "", holder: "", expiry: "", cvv: "" };
const initialPayState: PayOrderState = {};

// PAY-18, PAY-24, PAY-33..36, PAY-51, PAY-52, PAY-58, PAY-60, PAY-61: the
// /checkout/[orderId] client view. The step and the card live only in React
// state - never in storage or the URL (PAY-36) - so a reload starts over on
// the Tickets step with an empty card.
export function CheckoutView({ order, user, payAction }: CheckoutViewProps) {
  const [step, setStep] = useState<CheckoutStep>("tickets");
  const [card, setCard] = useState<CardInput>(emptyCard);
  const [fieldErrors, setFieldErrors] = useState<Partial<CardFieldErrors>>();
  const [timerExpired, setTimerExpired] = useState(false);

  const [payState, dispatchPay, paying] = useActionState(
    async (state: PayOrderState, input: PayOrderActionInput) => {
      const result = await payAction(state, input);
      if (result.reason === "INVALID_CARD") {
        setFieldErrors(result.fields);
        setStep("payment");
      }
      return result;
    },
    initialPayState,
  );

  // Stable, so CountdownTimer's interval doesn't restart on every render.
  const handleExpire = useCallback(() => setTimerExpired(true), []);

  const timedOut =
    order.status !== "PENDING" ||
    order.secondsLeft <= 0 ||
    timerExpired ||
    payState.reason === "ORDER_EXPIRED";
  const seatsHref = paths.eventSeats.getHref(
    order.event.id,
    order.ticketType.id,
    order.quantity,
  );

  function handleCardChange(next: CardInput) {
    setCard(next);
    setFieldErrors(undefined);
  }

  // Dispatched from a click, not a <form action>, so it needs a transition
  // for `paying` to update.
  function handlePay() {
    startTransition(() =>
      dispatchPay({
        orderId: order.id,
        card: { ...card, number: normalizeNumber(card.number) },
      }),
    );
  }

  const reviewError =
    payState.reason === "CARD_DECLINED" || payState.reason === "GENERIC"
      ? payState.reason
      : undefined;

  return (
    <div className="flex flex-col gap-12">
      <div className="mx-auto w-full max-w-[704px]">
        <CheckoutSteps current={step} />
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,508px)_minmax(0,600px)] lg:justify-between">
        <CheckoutEventCard
          event={order.event}
          ticketTypeName={order.ticketType.name}
          items={order.items}
        />

        <div className="flex flex-col gap-8">
          <CountdownTimer
            secondsLeft={order.secondsLeft}
            running={!timedOut}
            onExpire={handleExpire}
          />

          {payState.reason === "SEATS_UNAVAILABLE" ? (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-error-300">
                Your seats were just taken. You haven&apos;t been charged.
              </p>
              <Link href={seatsHref} className="text-tint-400 underline">
                Choose seats
              </Link>
            </div>
          ) : (
            <>
              {step === "tickets" && (
                <TicketsStep
                  quantity={order.quantity}
                  onConfirm={() => setStep("payment")}
                />
              )}
              {step === "payment" && (
                <>
                  <OrderSummary order={order} />
                  <CardForm
                    value={card}
                    onChange={handleCardChange}
                    errors={fieldErrors}
                    onSubmit={() => setStep("review")}
                  />
                </>
              )}
              {step === "review" && (
                <ReviewStep
                  user={user}
                  totalLabel={formatPrice(order.totalCents, order.currency)}
                  pending={paying}
                  error={reviewError}
                  onBack={() => setStep("payment")}
                  onPay={handlePay}
                />
              )}
            </>
          )}

          <FanProtectCard />
        </div>
      </div>

      <TimeOutDialog open={timedOut} seatsHref={seatsHref} />
    </div>
  );
}
