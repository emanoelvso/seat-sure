"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useMemo, type ReactNode } from "react";
import { env } from "@/config/env";
import {
  PAYMENTS_UNAVAILABLE,
  stripeMode,
} from "@/components/stripe/stripe-mode";

export type StripeSource = Stripe | Promise<Stripe | null> | null;

interface StripeProviderProps {
  children: ReactNode;
  // Stories pass a fake Stripe here so nothing loads from the network
  stripe?: StripeSource;
}

// GW-41, GW-42: loads Stripe.js once with the test-mode publishable key and
// gives the card Elements their context. A key that isn't a pk_test_ key never
// loads Stripe.js and shows a notice instead.
export function StripeProvider({ children, stripe }: StripeProviderProps) {
  const publishableKey = env.stripePublishableKey;
  const mode = stripe ? "test" : stripeMode(publishableKey);
  const stripePromise = useMemo(
    () =>
      stripe ??
      (mode === "test" && publishableKey ? loadStripe(publishableKey) : null),
    [stripe, mode, publishableKey],
  );

  if (mode === "off") return <>{children}</>;
  if (mode === "invalid" || !stripePromise) {
    return (
      <p role="alert" className="text-sm text-error-300">
        {PAYMENTS_UNAVAILABLE}
      </p>
    );
  }
  return <Elements stripe={stripePromise}>{children}</Elements>;
}
