// "off": no key, the typed card form and the simulated bank stay in place
// (GW-45). "test": a pk_test_ key, Stripe Elements are used (GW-41). "invalid":
// any other key (a live key included) never loads Stripe.js (GW-42).
export type StripeMode = "off" | "test" | "invalid";

export function stripeMode(publishableKey: string | undefined): StripeMode {
  if (!publishableKey) return "off";
  return publishableKey.startsWith("pk_test_") ? "test" : "invalid";
}

export const PAYMENTS_UNAVAILABLE = "Payments are unavailable right now.";
