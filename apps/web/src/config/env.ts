// The only module that reads process.env. Each NEXT_PUBLIC_* variable is read
// as a literal so Next.js can inline it in client bundles. Getters defer the
// read, so importing this module never throws when a variable is unset.
export const env = {
  // Read only by server actions/pages; pass the boolean explicitly to client UI.
  get demoMode(): boolean {
    return process.env.DEMO_MODE === "true";
  },
  // Server only. Authenticates the visitor address forwarded to the API for rate limiting.
  get clientAddressSecret(): string | undefined {
    return process.env.CLIENT_ADDRESS_SECRET || undefined;
  },
  get apiUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("Missing NEXT_PUBLIC_API_URL");
    return apiUrl;
  },
  // Public by design: Stripe.js needs it in the browser. Only a pk_test_ key
  // turns Stripe on (see stripeMode); unset keeps the typed card form.
  get stripePublishableKey(): string | undefined {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined;
  },
  get timeZone(): string {
    return process.env.NEXT_PUBLIC_TIME_ZONE ?? "UTC";
  },
};
