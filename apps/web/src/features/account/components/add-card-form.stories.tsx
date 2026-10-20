import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { createFakeStripe } from "@/components/stripe/fake-stripe";
import { AddCardForm, type AddCardFormHandle } from "./add-card-form";

type AddCardAction = React.ComponentProps<typeof AddCardForm>["action"];
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import type { AddPaymentCardState } from "@/features/account/api/add-payment-card-action";

const SAVED_CARD: PaymentCard = {
  __typename: "PaymentCard",
  id: "card-1",
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2039,
  holder: "Sara Lee",
  isDefault: true,
  expired: false,
};

// Fake Server Action: saves any card it gets.
const action = fn<AddCardAction>(async () => ({
  status: "saved",
  cards: [SAVED_CARD],
}));

const meta: Meta<typeof AddCardForm> = {
  title: "Features/Account/AddCardForm",
  component: AddCardForm,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: { action, isFirstCard: true, onSaved: fn() },
  beforeEach: () => {
    action.mockClear();
  },
  decorators: [
    (Story) => (
      <div className="w-[556px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddCardForm>;

export default meta;

type Story = StoryObj<typeof AddCardForm>;

const VALID_CARD = {
  holder: "Sara Lee",
  number: "4242424242424242",
  expiry: "1239",
  cvv: "123",
};

async function fillCard(
  canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"],
  userEvent: Parameters<NonNullable<Story["play"]>>[0]["userEvent"],
) {
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Name on card" }),
    VALID_CARD.holder,
  );
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Card number" }),
    VALID_CARD.number,
  );
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Expiry" }),
    VALID_CARD.expiry,
  );
  await userEvent.type(canvas.getByLabelText("CVC/CVV"), VALID_CARD.cvv);
}

// CARD-03 AC 1 and 6: the four labelled fields, "Save card", and the helper
// text while the user has no saved card.
export const Default: Story = {
  play: async ({ canvas }) => {
    for (const name of ["Name on card", "Card number", "Expiry"]) {
      await expect(canvas.getByRole("textbox", { name })).toBeVisible();
    }
    await expect(canvas.getByLabelText("CVC/CVV")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Save card" }),
    ).toBeEnabled();
    await expect(
      canvas.getByText("This credit card will be used by default for billing."),
    ).toBeVisible();
  },
};

// CARD-03 AC 6: no helper text once the user already has a card.
export const NotFirstCard: Story = {
  args: { isFirstCard: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByText(
        "This credit card will be used by default for billing.",
      ),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Save card" }),
    ).toBeVisible();
  },
};

// CARD-04 AC 7: an empty save is rejected with each rule's message under its
// field and nothing is sent.
export const RejectsBrokenRules: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await expect(canvas.getByText("Enter the name on the card")).toBeVisible();
    await expect(canvas.getByText("Enter a valid card number")).toBeVisible();
    await expect(canvas.getByText("Enter a valid expiry date")).toBeVisible();
    await expect(canvas.getByText("Enter a valid CVV")).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "Card number" }),
    ).toBeInvalid();
    await expect(action).not.toHaveBeenCalled();
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

// CARD-04 AC 7: a rule message shows once a non-empty field loses focus.
export const ShowsRuleOnBlur: Story = {
  play: async ({ canvas, userEvent }) => {
    const number = canvas.getByRole("textbox", { name: "Card number" });
    await userEvent.type(number, "4242");
    await expect(canvas.queryByText("Enter a valid card number")).toBeNull();

    await userEvent.tab();
    await expect(canvas.getByText("Enter a valid card number")).toBeVisible();
  },
};

// CARD-03 AC 2-3: a valid card goes to the action as typed, the form clears
// and onSaved receives the returned list.
export const SavesAndClears: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await fillCard(canvas, userEvent);
    await expect(
      canvas.getByRole("textbox", { name: "Card number" }),
    ).toHaveValue("4242 4242 4242 4242");

    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(args.onSaved).toHaveBeenCalledTimes(1));
    await expect(args.onSaved).toHaveBeenCalledWith([SAVED_CARD]);
    await expect(action).toHaveBeenCalledTimes(1);
    await expect(action.mock.calls[0][1]).toEqual({
      holder: "Sara Lee",
      number: "4242 4242 4242 4242",
      expiry: "12/39",
      cvv: "123",
    });
    for (const name of ["Name on card", "Card number", "Expiry"]) {
      await expect(canvas.getByRole("textbox", { name })).toHaveValue("");
    }
    await expect(canvas.getByLabelText("CVC/CVV")).toHaveValue("");
  },
};

const duplicateAction = fn(async (): Promise<AddPaymentCardState> => ({
  status: "error",
  fieldErrors: { number: "This card is already saved." },
}));

// CARD-04 AC 9: an API field error shows under its field, and editing that
// field hides it.
export const ShowsApiFieldError: Story = {
  args: { action: duplicateAction },
  play: async ({ canvas, userEvent }) => {
    await fillCard(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await expect(
      await canvas.findByText("This card is already saved."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "Card number" }),
    ).toBeInvalid();

    await userEvent.type(
      canvas.getByRole("textbox", { name: "Card number" }),
      "0",
    );
    await expect(canvas.queryByText("This card is already saved.")).toBeNull();
  },
};

const declinedAction = fn(async (): Promise<AddPaymentCardState> => ({
  status: "error",
  fieldErrors: {},
  formError: "This card was declined. Try another card.",
}));

// CARD-05 AC 12-13: a form error is announced in a role="alert" and the
// entered values stay.
export const ShowsFormErrorAndKeepsValues: Story = {
  args: { action: declinedAction },
  play: async ({ canvas, userEvent, args }) => {
    await fillCard(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "This card was declined. Try another card.",
    );
    await expect(
      canvas.getByRole("textbox", { name: "Name on card" }),
    ).toHaveValue("Sara Lee");
    await expect(
      canvas.getByRole("textbox", { name: "Card number" }),
    ).toHaveValue("4242 4242 4242 4242");
    await expect(canvas.getByLabelText("CVC/CVV")).toHaveValue("123");
    await expect(args.onSaved).not.toHaveBeenCalled();
  },
};

// Settled when the story ends: React queues later transitions behind one that
// never finishes, which would stall the stories that run after this one.
let settlePending: () => void = () => {};
const pendingAction = fn(
  () =>
    new Promise<AddPaymentCardState>((resolve) => {
      settlePending = () => resolve({ status: "idle", fieldErrors: {} });
    }),
);

// CARD-05 AC 14: while the save is in flight the button reads "Saving…" and
// is disabled.
export const DisablesWhilePending: Story = {
  args: { action: pendingAction },
  beforeEach: () => () => settlePending(),
  play: async ({ canvas, userEvent }) => {
    await fillCard(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    const saving = await canvas.findByRole("button", { name: "Saving…" });
    await expect(saving).toBeDisabled();
    await expect(
      canvas.queryByRole("button", { name: "Save card" }),
    ).toBeNull();
  },
};

function ResettableForm(props: React.ComponentProps<typeof AddCardForm>) {
  const handle = useRef<AddCardFormHandle>(null);
  return (
    <>
      <button type="button" onClick={() => handle.current?.reset()}>
        Reset form
      </button>
      <AddCardForm {...props} ref={handle} />
    </>
  );
}

// CARD-03 AC 15: reset() clears the form and moves focus to "Name on card".
export const ResetClearsAndFocuses: Story = {
  render: (args) => <ResettableForm {...args} />,
  play: async ({ canvas, userEvent }) => {
    await fillCard(canvas, userEvent);
    await userEvent.click(canvas.getByRole("button", { name: "Reset form" }));

    const name = canvas.getByRole("textbox", { name: "Name on card" });
    await expect(name).toHaveFocus();
    await expect(name).toHaveValue("");
    await expect(
      canvas.getByRole("textbox", { name: "Card number" }),
    ).toHaveValue("");
    await expect(canvas.getByRole("textbox", { name: "Expiry" })).toHaveValue(
      "",
    );
    await expect(canvas.getByLabelText("CVC/CVV")).toHaveValue("");
  },
};

const fakeStripe = createFakeStripe({ paymentMethodId: "pm_fake_123" });
const stripeAction = fn<
  (state: AddPaymentCardState, paymentMethodId: string) => Promise<AddPaymentCardState>
>(async () => ({ status: "saved", cards: [SAVED_CARD] }));

// GW-41: with Stripe Elements the card is typed into Elements, the action gets
// only the PaymentMethod id, the list comes back through onSaved and the form
// clears.
export const SavesWithStripeElements: Story = {
  args: { stripe: fakeStripe.stripe, stripeAction },
  beforeEach: () => {
    stripeAction.mockClear();
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Card number" }),
      "4242424242424242",
    );
    await userEvent.type(canvas.getByRole("textbox", { name: "Name on card" }), "Sara Lee");
    await userEvent.type(canvas.getByRole("textbox", { name: "Expiry" }), "1239");
    await userEvent.type(canvas.getByRole("textbox", { name: "CVC" }), "123");
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await waitFor(() => expect(stripeAction).toHaveBeenCalledTimes(1));
    await expect(stripeAction.mock.calls[0][1]).toBe("pm_fake_123");
    await waitFor(() => expect(args.onSaved).toHaveBeenCalledWith([SAVED_CARD]));
    await waitFor(() =>
      expect(canvas.getByRole("textbox", { name: "Name on card" })).toHaveValue(""),
    );
    await expect(action).not.toHaveBeenCalled();
  },
};

// GW-44: an incomplete Stripe field stops the save before the action runs.
export const StripeIncompleteFieldBlocksSave: Story = {
  args: { stripe: fakeStripe.stripe, stripeAction },
  beforeEach: () => {
    stripeAction.mockClear();
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("textbox", { name: "Card number" });
    await userEvent.click(canvas.getByRole("button", { name: "Save card" }));

    await expect(
      await canvas.findByText("Your card number is incomplete."),
    ).toBeVisible();
    await expect(stripeAction).not.toHaveBeenCalled();
  },
};

// GW-42: a publishable key that is not a pk_test_ key (a live key here) never
// loads Stripe.js; the form shows the notice and no card field.
export const LiveKeyShowsUnavailable: Story = {
  beforeEach: () => {
    const previous = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_not_allowed";
    return () => {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      } else {
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = previous;
      }
    };
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Payments are unavailable right now.",
    );
    await expect(canvas.queryByRole("textbox", { name: "Card number" })).toBeNull();
    await expect(canvas.queryByRole("textbox", { name: "CVC" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Save card" })).toBeNull();
  },
};

// GW-45: with no publishable key the typed form above is what renders (see
// Default).
