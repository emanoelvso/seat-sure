import type { Stripe } from "@stripe/stripe-js";
import { fn } from "storybook/test";

// A Stripe.js stand-in for stories: no script, no network. Each Element mounts
// a plain <input> so a play function can type into it; the "card" is complete
// when it holds the Stripe test values below. It only supports what the
// checkout and account forms use.
type ElementType = "cardNumber" | "cardExpiry" | "cardCvc";

const LABELS: Record<ElementType, string> = {
  cardNumber: "Card number",
  cardExpiry: "Expiry",
  cardCvc: "CVC",
};

const INCOMPLETE: Record<ElementType, string> = {
  cardNumber: "Your card number is incomplete.",
  cardExpiry: "Your card's expiration date is incomplete.",
  cardCvc: "Your card's security code is incomplete.",
};

type ChangeEvent = {
  elementType: ElementType;
  empty: boolean;
  complete: boolean;
  error?: { type: string; code: string; message: string };
};

function evaluate(type: ElementType, value: string): ChangeEvent {
  const digits = value.replace(/\D/g, "");
  const empty = digits.length === 0;
  const complete =
    (type === "cardNumber" && digits === "4242424242424242") ||
    (type === "cardExpiry" && digits.length === 4) ||
    (type === "cardCvc" && digits.length === 3);
  if (complete || empty) return { elementType: type, empty, complete };
  const invalidNumber = type === "cardNumber" && digits.length >= 16;
  return {
    elementType: type,
    empty,
    complete: false,
    error: {
      type: "validation_error",
      code: invalidNumber ? "invalid_number" : "incomplete",
      message: invalidNumber
        ? "Your card number is invalid."
        : INCOMPLETE[type],
    },
  };
}

function createElement(type: ElementType) {
  const handlers = new Map<string, Array<(event: unknown) => void>>();
  return {
    type,
    mount(node: HTMLElement) {
      const input = document.createElement("input");
      input.setAttribute("aria-label", LABELS[type]);
      input.className = "w-full bg-transparent text-white outline-none";
      input.addEventListener("input", () => {
        const event = evaluate(type, input.value);
        for (const handler of handlers.get("change") ?? []) handler(event);
      });
      node.appendChild(input);
    },
    on(event: string, handler: (event: unknown) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    },
    off(event: string, handler: (event: unknown) => void) {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((item) => item !== handler),
      );
    },
    update() {},
    destroy() {},
    focus() {},
  };
}

interface FakeStripeOptions {
  paymentMethodId?: string;
  // What createPaymentMethod answers instead of a PaymentMethod
  paymentMethodError?: { code: string; message: string };
  // What handleNextAction answers (a succeeded intent by default)
  nextActionError?: { code: string; message: string };
}

export function createFakeStripe({
  paymentMethodId = "pm_fake_123",
  paymentMethodError,
  nextActionError,
}: FakeStripeOptions = {}) {
  const elementsByType = new Map<string, ReturnType<typeof createElement>>();
  const elements = {
    create(type: ElementType) {
      const element = createElement(type);
      elementsByType.set(type, element);
      return element;
    },
    // Stripe.js takes the type or react-stripe-js's Element component
    getElement(reference: ElementType | { __elementType: ElementType }) {
      const type =
        typeof reference === "string" ? reference : reference.__elementType;
      return elementsByType.get(type) ?? null;
    },
  };

  const createPaymentMethod = fn(async () =>
    paymentMethodError
      ? { error: { type: "validation_error", ...paymentMethodError } }
      : { paymentMethod: { id: paymentMethodId } },
  );
  const handleNextAction = fn<
    (options: { clientSecret: string }) => Promise<unknown>
  >(async () =>
    nextActionError
      ? { error: { type: "card_error", ...nextActionError } }
      : { paymentIntent: { status: "requires_capture" } },
  );

  const stripe = {
    elements: () => elements,
    createToken: fn(),
    confirmCardPayment: fn(),
    createPaymentMethod,
    handleNextAction,
  };

  return {
    stripe: stripe as unknown as Stripe,
    createPaymentMethod,
    handleNextAction,
  };
}
