// What the browser needs to finish a 3-D Secure challenge (GW-08). The client
// secret only ever travels in a requires-action result, never in an error
// state.
export interface PaymentAction {
  provider: "simulated" | "stripe";
  clientSecret: string;
}

// The API sends the provider as a plain string; anything but Stripe is the
// simulated bank.
export function toPaymentAction(action: {
  provider: string;
  clientSecret: string;
}): PaymentAction {
  return {
    provider: action.provider === "stripe" ? "stripe" : "simulated",
    clientSecret: action.clientSecret,
  };
}
