"use client";

import { LockUnlockedIcon } from "@solar-icons/react/outline";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  type SyntheticEvent,
} from "react";
import { Button } from "@/components/ui/button";
import type {
  StartCheckoutActionInput,
  StartCheckoutState,
} from "@/features/checkout/api/start-checkout-action";

type StartAction = (
  state: StartCheckoutState,
  payload: StartCheckoutActionInput,
) => Promise<StartCheckoutState>;

interface LockedPriceDialogProps {
  startAction: StartAction;
  payload: StartCheckoutActionInput;
  seatsHref: string;
}

const initialState: StartCheckoutState = {};

// PAY-04, PAY-16, PAY-17: opens as soon as the Tickets step mounts and
// cannot be dismissed - the only ways out are "Start" or "Choose seats".
export function LockedPriceDialog({
  startAction,
  payload,
  seatsHref,
}: LockedPriceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [state, formAction, pending] = useActionState(
    startAction,
    initialState,
  );

  // The native modal gives the backdrop and the focus move for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      className="m-auto w-full max-w-[380px] rounded-2xl border-0 bg-neutral-700 p-8 text-center text-white backdrop:bg-black/70"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-full bg-primary/60 blur-2xl"
          />
          <LockUnlockedIcon
            size={56}
            aria-hidden="true"
            className="relative text-primary"
          />
        </div>

        <h2 id={headingId} className="text-xl font-bold">
          You have 10 minutes to complete your purchase
        </h2>
        <p className="text-sm text-neutral-200">
          The price of your tickets will be locked during this time
        </p>

        {state.error === "SEATS_UNAVAILABLE" && (
          <div className="flex flex-col items-center gap-2">
            <p role="alert" className="text-sm text-error-400">
              Some of your seats were just taken. Pick your seats again.
            </p>
            <Link href={seatsHref} className="text-primary underline">
              Choose seats
            </Link>
          </div>
        )}
        {state.error === "GENERIC" && (
          <p role="alert" className="text-sm text-error-400">
            We couldn&apos;t start your checkout. Try again.
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => startTransition(() => formAction(payload))}
        >
          Start
        </Button>
      </div>
    </dialog>
  );
}
