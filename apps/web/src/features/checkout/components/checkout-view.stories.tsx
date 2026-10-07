import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { vi } from "vitest";
import type { CheckoutPaymentCard } from "@/features/checkout/api/find-checkout-payment-cards";
import type {
  PayOrderActionInput,
  PayOrderState,
} from "@/features/checkout/api/pay-order-action";
import { zonedIso } from "@/testing/dates";
import { CheckoutView } from "./checkout-view";

type PayAction = (
  state: PayOrderState,
  input: PayOrderActionInput,
) => Promise<PayOrderState>;

const order = {
  id: "order-81",
  status: "PENDING" as const,
  secondsLeft: 583,
  quantity: 2,
  currency: "USD",
  totalCents: 110700,
  unitPriceCents: 45000,
  unitServiceFeeCents: 6750,
  unitTaxCents: 3600,
  event: {
    id: "event-12",
    name: "Adele",
    coverImage: "/artist/adele.png",
    venue: "Fontainbleau",
    city: "Las Vegas",
    country: "USA",
    startAt: zonedIso(2026, 7, 30, 19, 30),
  },
  ticketType: { id: "type-34", name: "VIP" },
  items: [
    { row: "7", number: "07" },
    { row: "7", number: "10" },
  ],
};

const meta: Meta<typeof CheckoutView> = {
  title: "Features/Checkout/CheckoutView",
  tags: ["autodocs"],
  component: CheckoutView,
  args: {
    order,
    user: {
      firstName: "Negar",
      lastName: "Khosravi",
      email: "negar.khosravi@example.com",
    },
    payAction: fn<PayAction>(async () => ({})),
  },
} satisfies Meta<typeof CheckoutView>;

export default meta;

type Story = StoryObj<typeof CheckoutView>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
type UserEvent = Parameters<NonNullable<Story["play"]>>[0]["userEvent"];

function currentStep(canvas: Canvas) {
  return within(canvas.getByRole("navigation", { name: "Checkout steps" }))
    .getAllByText(/Tickets|Payment|Review/)
    .find((el) => el.getAttribute("aria-current") === "step")?.textContent;
}

async function goToPayment(canvas: Canvas, userEvent: UserEvent) {
  await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
}

async function fillValidCard(canvas: Canvas, userEvent: UserEvent) {
  await userEvent.type(canvas.getByLabelText("Card number"), "4242424242424242");
  await userEvent.type(canvas.getByLabelText("Card holder"), "Negar Khosravi");
  await userEvent.type(canvas.getByLabelText("MM/YY"), "0830");
  await userEvent.type(canvas.getByLabelText("CVV"), "123");
}

async function goToReview(canvas: Canvas, userEvent: UserEvent) {
  await goToPayment(canvas, userEvent);
  await fillValidCard(canvas, userEvent);
  await userEvent.click(canvas.getByRole("button", { name: "Review order" }));
}

// PAY-18: opens on the Tickets step with the countdown, the copy and the
// read-only quantity.
export const Load: Story = {
  play: async ({ canvas }) => {
    await expect(currentStep(canvas)).toBe("Tickets");
    await expect(canvas.getByRole("timer")).toHaveAccessibleName(
      "9 minutes 43 seconds left",
    );
    await expect(
      canvas.getByText(
        "Make sure the number of tickets is correct before proceeding.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("definition")).toHaveTextContent(/^2$/);
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeEnabled();
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

// PAY-24, PAY-25: "Confirm" shows the Payment step with the order summary.
export const ConfirmToPayment: Story = {
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);

    await expect(currentStep(canvas)).toBe("Payment");
    await expect(
      canvas.getByRole("heading", { name: "Order summary" }),
    ).toBeVisible();
    await expect(canvas.getByText("2 * $450")).toBeVisible();
    await expect(canvas.getByText("$1,107")).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Payment details" }),
    ).toBeVisible();
  },
};

// PAY-33, PAY-34: a valid card + "Review order" shows the Review step.
export const ValidCardToReview: Story = {
  play: async ({ canvas, userEvent }) => {
    await goToReview(canvas, userEvent);

    await expect(currentStep(canvas)).toBe("Review");
    await expect(canvas.getByText("Negar Khosravi")).toBeVisible();
    await expect(canvas.getByText("negar.khosravi@example.com")).toBeVisible();
    await expect(canvas.getByText("Total price : $1,107")).toBeVisible();
  },
};

// PAY-35: "Back" returns to Payment with every typed value kept.
export const BackKeepsValues: Story = {
  play: async ({ canvas, userEvent }) => {
    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));

    await expect(currentStep(canvas)).toBe("Payment");
    await expect(canvas.getByLabelText("Card number")).toHaveValue(
      "4242 4242 4242 4242",
    );
    await expect(canvas.getByLabelText("Card holder")).toHaveValue(
      "Negar Khosravi",
    );
    await expect(canvas.getByLabelText("MM/YY")).toHaveValue("08/30");
    await expect(canvas.getByLabelText("CVV")).toHaveValue("123");
    await expect(
      canvas.getByRole("button", { name: "Review order" }),
    ).toBeEnabled();
  },
};

// PAY-36, PAY-49: "Pay" sends the order id and the card with the number's
// spaces removed, and reads "Paying…" (disabled) while the request is in
// flight.
export const Pay: Story = {
  play: async ({ args, canvas, userEvent }) => {
    let finish: (state: PayOrderState) => void = () => {};
    vi.mocked(args.payAction).mockImplementationOnce(
      () => new Promise<PayOrderState>((resolve) => (finish = resolve)),
    );

    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(args.payAction).toHaveBeenCalledTimes(1);
    await expect(vi.mocked(args.payAction).mock.calls[0][1]).toEqual({
      orderId: "order-81",
      card: {
        number: "4242424242424242",
        holder: "Negar Khosravi",
        expiry: "08/30",
        cvv: "123",
      },
    });
    await expect(
      await canvas.findByRole("button", { name: "Paying…" }),
    ).toBeDisabled();

    finish({ reason: "CARD_DECLINED" });
    await expect(
      await canvas.findByRole("button", { name: "Pay" }),
    ).toBeEnabled();
  },
};

// PAY-52: INVALID_CARD returns to Payment and shows the server's field error.
export const InvalidCardResult: Story = {
  args: {
    payAction: fn<PayAction>(async () => ({
      reason: "INVALID_CARD",
      fields: { number: "Enter a valid card number" },
    })),
  },
  play: async ({ canvas, userEvent }) => {
    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(
      await canvas.findByText("Enter a valid card number"),
    ).toBeVisible();
    await expect(currentStep(canvas)).toBe("Payment");
    await expect(canvas.getByLabelText("Card number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

// PAY-51: SEATS_UNAVAILABLE shows its copy and a "Choose seats" link to the
// seat page with the same quantity.
export const SeatsUnavailableResult: Story = {
  args: {
    payAction: fn<PayAction>(async () => ({ reason: "SEATS_UNAVAILABLE" })),
  },
  play: async ({ canvas, userEvent }) => {
    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Your seats were just taken. You haven't been charged.",
    );
    await expect(
      canvas.getByRole("link", { name: "Choose seats" }),
    ).toHaveAttribute("href", "/events/event-12/tickets/type-34?quantity=2");
  },
};

// PAY-61: ORDER_EXPIRED opens the time-out dialog.
export const OrderExpiredResult: Story = {
  args: {
    payAction: fn<PayAction>(async () => ({ reason: "ORDER_EXPIRED" })),
  },
  play: async ({ canvas, userEvent }) => {
    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(
      await canvas.findByRole("dialog", { name: "Your time ran out" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Choose seats" }),
    ).toHaveAttribute("href", "/events/event-12/tickets/type-34?quantity=2");
  },
};

// PAY-60: an order that is no longer pending opens the time-out dialog on
// load.
export const ExpiredAtLoad: Story = {
  args: { order: { ...order, status: "EXPIRED", secondsLeft: 0 } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("dialog", { name: "Your time ran out" }),
    ).toBeVisible();
  },
};

// PAY-60: a pending order whose time already ran out opens it on load too.
export const PendingPastExpiryAtLoad: Story = {
  args: { order: { ...order, secondsLeft: 0 } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("dialog", { name: "Your time ran out" }),
    ).toBeVisible();
  },
};

// Fake timers advance setInterval, but React flushes the state update
// through a real MessageChannel task - a real animation frame lets it settle
// (see countdown-timer.stories.tsx).
function flushReact() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

// PAY-58: the countdown reaching 0 opens the time-out dialog. Timers are
// faked in a decorator so the countdown's interval is fake from mount.
export const TimerExpiry: Story = {
  args: { order: { ...order, secondsLeft: 2 } },
  decorators: [
    (StoryFn) => {
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
      });
      return StoryFn();
    },
  ],
  play: async ({ canvas }) => {
    try {
      await flushReact();
      await expect(canvas.queryByRole("dialog")).toBeNull();

      await vi.advanceTimersByTimeAsync(2000);
      await flushReact();

      await expect(
        canvas.getByRole("dialog", { name: "Your time ran out" }),
      ).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  },
};

// PAY-36: through a full flow (type, review, back, pay) nothing written to
// local/session storage or the history/URL contains the card number.
export const NoCardDataStored: Story = {
  args: {
    payAction: fn<PayAction>(async () => ({ reason: "CARD_DECLINED" })),
  },
  play: async ({ canvas, userEvent }) => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const pushState = vi.spyOn(window.history, "pushState");
    const replaceState = vi.spyOn(window.history, "replaceState");

    try {
      await goToReview(canvas, userEvent);
      await userEvent.click(canvas.getByRole("button", { name: "Back" }));
      await userEvent.click(canvas.getByRole("button", { name: "Review order" }));
      await userEvent.click(canvas.getByRole("button", { name: "Pay" }));
      await canvas.findByRole("alert");

      const writes = [
        ...setItem.mock.calls,
        ...pushState.mock.calls,
        ...replaceState.mock.calls,
      ].map((call) => JSON.stringify(call));
      const leaked = writes.filter(
        (write) =>
          write.includes("4242424242424242") ||
          write.includes("4242 4242 4242 4242"),
      );

      await expect(leaked).toEqual([]);
      await expect(window.location.href).not.toContain("4242");
    } finally {
      setItem.mockRestore();
      pushState.mockRestore();
      replaceState.mockRestore();
    }
  },
};

// Saved cards (CARD-07..09). a11y "error" makes the addon's violations fail
// these stories. Color contrast is left out here only: the built checkout
// (countdown digits, input labels, the primary Confirm/Pay buttons) fails it
// already, which is why the stories above run in the default "todo" mode.
// The picker's own contrast is checked in saved-card-picker.stories.tsx.
const savedCard = (
  last4: string,
  overrides: Partial<CheckoutPaymentCard> = {},
): CheckoutPaymentCard => ({
  __typename: "PaymentCard",
  id: `card-${last4}`,
  brand: "visa",
  last4,
  expMonth: 8,
  expYear: 2030,
  holder: "Negar Khosravi",
  isDefault: false,
  expired: false,
  ...overrides,
});
const SAVED_CARDS = [
  savedCard("4242", { isDefault: true }),
  savedCard("4444", { brand: "mastercard" }),
];
const strictA11y = {
  a11y: {
    test: "error",
    options: { rules: { "color-contrast": { enabled: false } } },
  },
};

// CARD-07 AC 1: with saved cards the Payment step is the picker, not the
// summary and the form.
export const SavedCardsShowPicker: Story = {
  args: { cards: SAVED_CARDS },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);

    await expect(currentStep(canvas)).toBe("Payment");
    await expect(
      canvas.getByRole("heading", { name: "Select payment method" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("radio", { name: "Visa •••• 4242" }),
    ).toBeChecked();
    await expect(
      canvas.queryByRole("heading", { name: "Payment details" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("heading", { name: "Order summary" }),
    ).toBeNull();
  },
};

// CARD-07 AC 12, CARD-09 AC 1: no saved cards → summary and form as built,
// no picker, an unchecked "Save this card" box and no "Use a saved card".
export const NoSavedCardsShowForm: Story = {
  args: { cards: [] },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);

    await expect(
      canvas.getByRole("heading", { name: "Payment details" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Select payment method" }),
    ).toBeNull();
    await expect(
      canvas.getByRole("checkbox", {
        name: "Save this card for future payments",
      }),
    ).not.toBeChecked();
    await expect(
      canvas.queryByRole("button", { name: "Use a saved card" }),
    ).toBeNull();
  },
};

// CARD-07 AC 5, CARD-08 AC 8: confirming a saved card goes to Review, and
// Pay sends only the order id and the saved card id.
export const PayWithSavedCard: Story = {
  args: { cards: SAVED_CARDS },
  parameters: strictA11y,
  play: async ({ args, canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(
      canvas.getByRole("radio", { name: "Mastercard •••• 4444" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(currentStep(canvas)).toBe("Review");
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(args.payAction).toHaveBeenCalledTimes(1);
    await expect(vi.mocked(args.payAction).mock.calls[0][1]).toStrictEqual({
      orderId: "order-81",
      savedCardId: "card-4444",
    });
  },
};

// CARD-07 AC 6-7: "New card" shows the summary and the form with "Use a
// saved card", which returns to the picker.
export const NewCardAndBack: Story = {
  args: { cards: SAVED_CARDS },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(canvas.getByRole("radio", { name: "New card" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(currentStep(canvas)).toBe("Payment");
    await expect(
      canvas.getByRole("heading", { name: "Order summary" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Payment details" }),
    ).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", { name: "Use a saved card" }),
    );
    await expect(
      canvas.getByRole("heading", { name: "Select payment method" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Payment details" }),
    ).toBeNull();
  },
};

// CARD-09 AC 1, 3: checking the box sends saveCard: true with the typed card.
export const SaveTypedCard: Story = {
  args: { cards: SAVED_CARDS },
  parameters: strictA11y,
  play: async ({ args, canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(canvas.getByRole("radio", { name: "New card" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await fillValidCard(canvas, userEvent);
    const box = canvas.getByRole("checkbox", {
      name: "Save this card for future payments",
    });
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await userEvent.click(canvas.getByRole("button", { name: "Review order" }));
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(vi.mocked(args.payAction).mock.calls[0][1]).toStrictEqual({
      orderId: "order-81",
      card: {
        number: "4242424242424242",
        holder: "Negar Khosravi",
        expiry: "08/30",
        cvv: "123",
      },
      saveCard: true,
    });
  },
};

// CARD-09 AC 6: left unchecked, the typed card is paid without saveCard.
export const DontSaveTypedCard: Story = {
  args: { cards: [] },
  parameters: strictA11y,
  play: async ({ args, canvas, userEvent }) => {
    await goToReview(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    const input = vi.mocked(args.payAction).mock.calls[0][1];
    await expect("savedCardId" in input).toBe(false);
    await expect("saveCard" in input && input.saveCard).toBeFalsy();
  },
};

// CARD-09 AC 2: at 5 saved cards the box is not shown.
export const NoSaveBoxAtLimit: Story = {
  args: {
    cards: ["0001", "0002", "0003", "0004", "0005"].map((last4, index) =>
      savedCard(last4, { isDefault: index === 0 }),
    ),
  },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(canvas.getByRole("radio", { name: "New card" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(
      canvas.getByRole("heading", { name: "Payment details" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("checkbox", {
        name: "Save this card for future payments",
      }),
    ).toBeNull();
  },
};

// CARD-08 AC 9: CARD_NOT_FOUND returns to the picker with its alert.
export const SavedCardNotFound: Story = {
  args: {
    cards: SAVED_CARDS,
    payAction: fn<PayAction>(async () => ({ reason: "CARD_NOT_FOUND" })),
  },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "This card is no longer available. Choose another payment method.",
    );
    await expect(currentStep(canvas)).toBe("Payment");
    await expect(
      canvas.getByRole("heading", { name: "Select payment method" }),
    ).toBeVisible();
  },
};

// CARD-08 AC 10: a declined saved card shows the existing declined message
// on Review.
export const SavedCardDeclined: Story = {
  args: {
    cards: SAVED_CARDS,
    payAction: fn<PayAction>(async () => ({ reason: "CARD_DECLINED" })),
  },
  parameters: strictA11y,
  play: async ({ canvas, userEvent }) => {
    await goToPayment(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await userEvent.click(canvas.getByRole("button", { name: "Pay" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Your card was declined. Check the details or use another card.",
    );
    await expect(currentStep(canvas)).toBe("Review");
  },
};
