"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useState,
} from "react";
import { paths } from "@/config/paths";
import { env } from "@/config/env";
import {
  PAYMENTS_UNAVAILABLE,
  stripeMode,
} from "@/components/stripe/stripe-mode";
import {
  StripeProvider,
  type StripeSource,
} from "@/components/stripe/stripe-provider";
import { StripeCardFields } from "@/components/stripe/stripe-card-fields";
import type {
  ConfirmOrderPaymentReason,
  ConfirmOrderPaymentResult,
} from "@/features/checkout/api/confirm-order-payment-action";
import type { CheckoutPaymentCard } from "@/features/checkout/api/find-checkout-payment-cards";
import type {
  PayOrderActionInput,
  PayOrderState,
} from "@/features/checkout/api/pay-order-action";
import {
  toPaymentAction,
  type PaymentAction,
} from "@/features/checkout/api/payment-action";
import type {
  SimulatedBankOutcome,
  SimulatedBankResult,
} from "@/features/checkout/api/simulated-bank-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardForm } from "@/features/checkout/components/card-form";
import { CheckoutEventCard } from "@/features/checkout/components/checkout-event-card";
import {
  CheckoutSteps,
  type CheckoutStep,
} from "@/features/checkout/components/checkout-steps";
import { CountdownTimer } from "@/features/checkout/components/countdown-timer";
import { FanProtectCard } from "@/features/checkout/components/fan-protect-card";
import { OrderSummary } from "@/features/checkout/components/order-summary";
import { PaymentChallengeDialog } from "@/features/checkout/components/payment-challenge-dialog";
import { ReviewStep } from "@/features/checkout/components/review-step";
import {
  NEW_CARD,
  SavedCardPicker,
} from "@/features/checkout/components/saved-card-picker";
import { TicketsStep } from "@/features/checkout/components/tickets-step";
import { TimeOutDialog } from "@/features/checkout/components/time-out-dialog";
import {
  normalizeNumber,
  type CardFieldErrors,
  type CardInput,
} from "@/utils/card";
import type { CheckoutOrderStatus } from "@/types/__generated__/graphql";
import { formatPrice } from "@/utils/price";

type PayAction = (
  state: PayOrderState,
  input: PayOrderActionInput,
) => Promise<PayOrderState>;

type BankAction = (
  clientSecret: string,
  outcome: SimulatedBankOutcome,
) => Promise<SimulatedBankResult>;

type ConfirmAction = (orderId: string) => Promise<ConfirmOrderPaymentResult>;

interface CheckoutViewProps {
  order: {
    id: string;
    status: CheckoutOrderStatus;
    secondsLeft: number;
    quantity: number;
    currency: string;
    totalCents: number;
    unitPriceCents: number;
    subtotalCents: number;
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
    // A paused order's challenge, for its owner only (GW-30)
    paymentAction?: { provider: string; clientSecret: string } | null;
  };
  user: { firstName: string; lastName: string; email: string };
  // The caller's saved cards, default first (CARD-07)
  cards?: CheckoutPaymentCard[];
  payAction: PayAction;
  // GW-25: answers the simulated bank, then settles the paused order
  bankAction: BankAction;
  confirmAction: ConfirmAction;
  // Stories hand in a fake Stripe; the real one loads from the publishable key
  stripe?: StripeSource;
}

const emptyCard: CardInput = { number: "", holder: "", expiry: "", cvv: "" };
const initialPayState: PayOrderState = {};
const MAX_SAVED_CARDS = 5;
const CARD_NOT_FOUND_ERROR =
  "This card is no longer available. Choose another payment method.";

// PAY-18, PAY-24, PAY-33..36, PAY-51, PAY-52, PAY-58, PAY-60, PAY-61: the
// /checkout/[orderId] client view. The step and the card live only in React
// state - never in storage or the URL (PAY-36) - so a reload starts over on
// the Tickets step with an empty card.
// CARD-07..09: with saved cards the Payment step opens on the picker; "New
// card" (or no saved cards) shows the summary and the card form as before,
// with the opt-in "Save this card" box and, when there are saved cards, a
// way back to the picker. The chosen source is what "Pay" sends.
export function CheckoutView({
  order,
  user,
  cards = [],
  payAction,
  bankAction,
  confirmAction,
  stripe,
}: CheckoutViewProps) {
  const router = useRouter();
  // GW-41, GW-42, GW-45: Stripe Elements with a test-mode key, the typed card
  // form without one, a notice with any other key
  const mode = stripe ? "test" : stripeMode(env.stripePublishableKey);
  // GW-30: an order that was paused by a 3-D Secure challenge before a reload
  // opens on a resume panel instead of the Tickets step
  const [resuming, setResuming] = useState(order.status === "REQUIRES_ACTION");
  const [step, setStep] = useState<CheckoutStep>(
    order.status === "REQUIRES_ACTION" ? "review" : "tickets",
  );
  const [card, setCard] = useState<CardInput>(emptyCard);
  const [fieldErrors, setFieldErrors] = useState<Partial<CardFieldErrors>>();
  const [timerExpired, setTimerExpired] = useState(false);
  const [usePicker, setUsePicker] = useState(true);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  // GW-41: the PaymentMethod Stripe made from the card typed in Elements
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState("");
  // GW-24..GW-29: the 3-D Secure challenge the buyer is completing, and why
  // the last one ended without a payment
  const [challenge, setChallenge] = useState<PaymentAction | null>(null);
  const [settling, setSettling] = useState(false);
  const [confirmReason, setConfirmReason] =
    useState<ConfirmOrderPaymentReason | null>(null);

  const [payState, dispatchPay, paying] = useActionState(
    async (state: PayOrderState, input: PayOrderActionInput) => {
      const result = await payAction(state, input);
      if (result.requiresAction) {
        setChallenge(result.requiresAction);
      }
      if (result.reason === "INVALID_CARD") {
        setFieldErrors(result.fields);
        setStep("payment");
      }
      if (result.reason === "CARD_NOT_FOUND") {
        // CARD-08 AC 9: recover on Payment and reload the available cards.
        router.refresh();
        setSavedCardId(null);
        setUsePicker(true);
        setPickerError(CARD_NOT_FOUND_ERROR);
        setStep("payment");
      }
      return result;
    },
    initialPayState,
  );

  // Stable, so CountdownTimer's interval doesn't restart on every render.
  const handleExpire = useCallback(() => setTimerExpired(true), []);

  const timedOut =
    (order.status !== "PENDING" && order.status !== "REQUIRES_ACTION") ||
    order.secondsLeft <= 0 ||
    timerExpired ||
    payState.reason === "ORDER_EXPIRED" ||
    confirmReason === "ORDER_EXPIRED";
  const seatsUnavailable =
    payState.reason === "SEATS_UNAVAILABLE" ||
    confirmReason === "SEATS_UNAVAILABLE";
  const seatsHref = paths.eventSeats.getHref(
    order.event.id,
    order.ticketType.id,
    order.quantity,
  );

  function handleCardChange(next: CardInput) {
    setCard(next);
    setFieldErrors(undefined);
  }

  function handlePickerConfirm(choice: string) {
    setPickerError("");
    if (choice === NEW_CARD) {
      setSavedCardId(null);
      setUsePicker(false);
      return;
    }
    setSavedCardId(choice);
    setStep("review");
  }

  function handleCardSubmit() {
    setSavedCardId(null);
    setPaymentMethodId(null);
    setStep("review");
  }

  function handlePaymentMethod(id: string) {
    setSavedCardId(null);
    setPaymentMethodId(id);
    setStep("review");
  }

  // Dispatched from a click, not a <form action>, so it needs a transition
  // for `paying` to update. `saveCard` is only sent when checked; the API
  // defaults it to false.
  function handlePay() {
    setConfirmReason(null);
    startTransition(() =>
      dispatchPay(
        savedCardId
          ? { orderId: order.id, savedCardId }
          : mode === "test" && paymentMethodId
            ? {
                orderId: order.id,
                paymentMethodId,
                ...(saveCard && { saveCard: true }),
              }
            : {
                orderId: order.id,
                card: { ...card, number: normalizeNumber(card.number) },
                ...(saveCard && { saveCard: true }),
              },
      ),
    );
  }

  // Settles the paused order: a result either ends the flow (paid, or the
  // reason it didn't go through) or keeps the challenge going
  async function confirmOrder() {
    const result = await confirmAction(order.id);

    if ("paid" in result) {
      setChallenge(null);
      router.push(paths.checkoutSuccess.getHref(order.id));
    } else if ("requiresAction" in result) {
      setChallenge(result.requiresAction);
    } else {
      setChallenge(null);
      setConfirmReason(result.reason);
      // A resumed order lost the card typed before the reload: start again
      // from Payment
      setStep(resuming ? "payment" : "review");
      setResuming(false);
    }
  }

  // GW-25: the bank hears the outcome first, then the API settles the order.
  // A bank that can't be reached still lets the API decide: it reads the
  // payment itself.
  async function handleChallengeSettled(outcome: SimulatedBankOutcome) {
    if (!challenge) return;
    setSettling(true);
    try {
      // Stripe's own challenge has no simulated bank to tell
      if (challenge.provider === "simulated") {
        await bankAction(challenge.clientSecret, outcome);
      }
      await confirmOrder();
    } finally {
      setSettling(false);
    }
  }

  // GW-31: "Continue" reopens the challenge. A payment that no longer needs
  // one is settled straight away.
  async function handleResume() {
    if (order.paymentAction) {
      setChallenge(toPaymentAction(order.paymentAction));
      return;
    }
    setSettling(true);
    try {
      await confirmOrder();
    } finally {
      setSettling(false);
    }
  }

  const showPicker = usePicker && cards.length > 0;

  const cardFooter = (
    <div className="flex flex-col items-start gap-4">
      {cards.length < MAX_SAVED_CARDS && (
        <Checkbox
          label="Save this card for future payments"
          checked={saveCard}
          onCheckedChange={setSaveCard}
        />
      )}
      {cards.length > 0 && (
        <button
          type="button"
          onClick={() => setUsePicker(true)}
          className="cursor-pointer text-base text-tint-400 underline hover:text-tint-300"
        >
          Use a saved card
        </button>
      )}
    </div>
  );

  const reviewError =
    payState.reason === "CARD_DECLINED" ||
    payState.reason === "CARD_ATTEMPTS_LIMITED" ||
    payState.reason === "AUTHENTICATION_FAILED" ||
    payState.reason === "GENERIC"
      ? payState.reason
      : confirmReason === "AUTHENTICATION_FAILED" ||
          confirmReason === "GENERIC"
        ? confirmReason
        : undefined;

  const view = (
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

          {seatsUnavailable ? (
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
              {resuming && (
                <div className="flex flex-col items-start gap-4">
                  <h2 className="text-xl font-bold text-white">
                    Finish verifying your payment
                  </h2>
                  <p className="text-sm text-neutral-200">
                    Your bank asked you to verify this payment. Continue to
                    complete it before your time runs out.
                  </p>
                  <Button
                    type="button"
                    size="xl"
                    disabled={settling}
                    onClick={handleResume}
                  >
                    Continue
                  </Button>
                </div>
              )}
              {!resuming && step === "tickets" && (
                <TicketsStep
                  quantity={order.quantity}
                  onConfirm={() => setStep("payment")}
                />
              )}
              {!resuming && step === "payment" && showPicker && (
                <SavedCardPicker
                  cards={cards}
                  error={pickerError || undefined}
                  onConfirm={handlePickerConfirm}
                />
              )}
              {!resuming && step === "payment" && !showPicker && (
                <>
                  <OrderSummary order={order} />
                  {mode === "invalid" ? (
                    <p role="alert" className="text-sm text-error-300">
                      {PAYMENTS_UNAVAILABLE}
                    </p>
                  ) : mode === "test" ? (
                    <div className="flex flex-col gap-6">
                      <h2 className="text-xl font-bold text-white">
                        Payment details
                      </h2>
                      <StripeCardFields
                        submitLabel="Review order"
                        onPaymentMethod={handlePaymentMethod}
                        footer={cardFooter}
                      />
                    </div>
                  ) : (
                    <CardForm
                      value={card}
                      onChange={handleCardChange}
                      errors={fieldErrors}
                      onSubmit={handleCardSubmit}
                      footer={cardFooter}
                    />
                  )}
                </>
              )}
              {!resuming && step === "review" && (
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

      <PaymentChallengeDialog
        open={challenge !== null && !timedOut}
        action={challenge}
        pending={settling}
        onSettled={handleChallengeSettled}
      />
      <TimeOutDialog open={timedOut} seatsHref={seatsHref} />
    </div>
  );

  return mode === "test" ? (
    <StripeProvider stripe={stripe}>{view}</StripeProvider>
  ) : (
    view
  );
}
