"use client";

import { useStripe } from "@stripe/react-stripe-js";
import { useEffect, useId, useRef, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import type { PaymentAction } from "@/features/checkout/api/payment-action";
import type { SimulatedBankOutcome } from "@/features/checkout/api/simulated-bank-action";

interface PaymentChallengeDialogProps {
  open: boolean;
  // While the outcome is being posted and confirmed: the choice is made
  pending?: boolean;
  // Which bank runs the challenge; Stripe's runs in Stripe's own window (GW-43)
  action?: PaymentAction | null;
  onSettled: (outcome: SimulatedBankOutcome) => void;
}

// GW-24, GW-25: the simulated bank's 3-D Secure page, in a modal so the
// checkout and its countdown stay visible behind it. Escape or "Close" count
// as failing the challenge - the buyer never leaves it undecided.
export function PaymentChallengeDialog({
  open,
  pending = false,
  action,
  onSettled,
}: PaymentChallengeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function settle(outcome: SimulatedBankOutcome) {
    if (pending) return;
    onSettled(outcome);
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    settle("fail");
  }

  if (action?.provider === "stripe") {
    return (
      <StripeChallenge
        open={open}
        clientSecret={action.clientSecret}
        onSettled={onSettled}
      />
    );
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      className="m-auto w-full max-w-[420px] rounded-2xl border-0 bg-neutral-700 p-8 text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-neutral-200">
            Test bank
          </p>
          <h2 id={headingId} className="text-xl font-bold">
            Verify your payment
          </h2>
          <p className="text-sm text-neutral-200">
            Your bank asks you to confirm this payment. This is a simulated
            bank: choose how the verification ends.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => settle("fail")}
          >
            Fail
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={() => settle("approve")}
          >
            Approve
          </Button>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => settle("fail")}
          className="cursor-pointer self-center text-sm text-tint-400 underline disabled:cursor-default disabled:text-neutral-300 disabled:no-underline"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}

interface StripeChallengeProps {
  open: boolean;
  clientSecret: string;
  onSettled: (outcome: SimulatedBankOutcome) => void;
}

// GW-43: hands the intent to Stripe.js, which opens the bank's 3-D Secure
// window itself, and settles when it closes. Whatever the result, the API
// reads the payment's real state when the order is confirmed, so an error here
// only reports "fail" and never decides the outcome.
function StripeChallenge({ open, clientSecret, onSettled }: StripeChallengeProps) {
  const stripe = useStripe();
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      started.current = null;
      return;
    }
    if (!stripe || started.current === clientSecret) return;
    started.current = clientSecret;
    stripe.handleNextAction({ clientSecret }).then(
      (result) => onSettled(result.error ? "fail" : "approve"),
      () => onSettled("fail"),
    );
  }, [open, stripe, clientSecret, onSettled]);

  return open ? (
    <p role="status" className="sr-only">
      Verifying your payment with your bank
    </p>
  ) : null;
}
