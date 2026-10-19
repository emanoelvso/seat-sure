import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { createFakeStripe } from "@/components/stripe/fake-stripe";
import { StripeProvider } from "@/components/stripe/stripe-provider";
import { PaymentChallengeDialog } from "./payment-challenge-dialog";

const settlingStripe = createFakeStripe();
const failingStripe = createFakeStripe({
  nextActionError: { code: "payment_intent_authentication_failure", message: "Failed" },
});
const idleStripe = createFakeStripe();

const meta: Meta<typeof PaymentChallengeDialog> = {
  title: "Features/Checkout/PaymentChallengeDialog",
  tags: ["autodocs"],
  component: PaymentChallengeDialog,
  args: {
    open: true,
    pending: false,
    onSettled: fn(),
  },
} satisfies Meta<typeof PaymentChallengeDialog>;

export default meta;

type Story = StoryObj<typeof PaymentChallengeDialog>;

// GW-24: a modal named "Verify your payment" with Approve and Fail.
export const Open: Story = {
  play: async ({ canvas }) => {
    const modal = canvas.getByRole("dialog", {
      name: "Verify your payment",
    }) as HTMLDialogElement;
    await expect(modal.open).toBe(true);
    await expect(canvas.getByRole("button", { name: "Approve" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Fail" })).toBeEnabled();
  },
};

// GW-25: Approve settles the challenge as approved.
export const Approve: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Approve" }));

    await expect(args.onSettled).toHaveBeenCalledTimes(1);
    await expect(args.onSettled).toHaveBeenCalledWith("approve");
  },
};

// GW-25: Fail settles the challenge as failed.
export const Fail: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Fail" }));

    await expect(args.onSettled).toHaveBeenCalledTimes(1);
    await expect(args.onSettled).toHaveBeenCalledWith("fail");
  },
};

// Escape reaches a modal dialog as a cancelable `cancel` event; synthetic key
// presses don't trigger it, so the story dispatches the event itself.
function pressEscape(canvas: { getByRole: (role: string, options: { name: string }) => HTMLElement }) {
  const modal = canvas.getByRole("dialog", { name: "Verify your payment" });
  const cancel = new Event("cancel", { cancelable: true });
  modal.dispatchEvent(cancel);
  return cancel;
}

// GW-25: closing the dialog, with Escape or the Close button, counts as Fail.
export const CloseCountsAsFail: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const cancel = pressEscape(canvas);

    await expect(cancel.defaultPrevented).toBe(true);
    await expect(args.onSettled).toHaveBeenCalledTimes(1);
    await expect(args.onSettled).toHaveBeenLastCalledWith("fail");

    await userEvent.click(canvas.getByRole("button", { name: "Close" }));

    await expect(args.onSettled).toHaveBeenCalledTimes(2);
    await expect(args.onSettled).toHaveBeenLastCalledWith("fail");
  },
};

// While the outcome is being confirmed the choice can't change.
export const Pending: Story = {
  args: { pending: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Fail" })).toBeDisabled();

    pressEscape(canvas);

    await expect(args.onSettled).not.toHaveBeenCalled();
  },
};

// `open={false}` renders no dialog at all.
export const Closed: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

const stripeAction = { provider: "stripe" as const, clientSecret: "pi_secret_1" };

// GW-43: in Stripe mode the dialog hands the client secret to Stripe.js and
// settles when it is done; there are no simulated bank buttons.
export const StripeChallengeSettles: Story = {
  args: { action: stripeAction },
  decorators: [
    (Story) => {
      return (
        <StripeProvider stripe={settlingStripe.stripe}>
          <Story />
        </StripeProvider>
      );
    },
  ],
  play: async ({ args, canvas }) => {
    await waitFor(() =>
      expect(settlingStripe.handleNextAction).toHaveBeenCalledWith({
        clientSecret: "pi_secret_1",
      }),
    );
    await waitFor(() => expect(args.onSettled).toHaveBeenCalledTimes(1));
    await expect(settlingStripe.handleNextAction).toHaveBeenCalledTimes(1);
    await expect(canvas.queryByRole("button", { name: "Approve" })).toBeNull();
  },
};

// GW-43: an error from Stripe still settles, so the order is confirmed and the
// API decides from the payment's real state.
export const StripeChallengeErrorStillSettles: Story = {
  args: { action: stripeAction },
  decorators: [
    (Story) => (
      <StripeProvider stripe={failingStripe.stripe}>
        <Story />
      </StripeProvider>
    ),
  ],
  play: async ({ args }) => {
    await waitFor(() => expect(args.onSettled).toHaveBeenCalledTimes(1));
    await expect(failingStripe.handleNextAction).toHaveBeenCalledWith({
      clientSecret: "pi_secret_1",
    });
  },
};

// Stripe is not asked to run a challenge while the dialog is closed.
export const StripeClosedDoesNothing: Story = {
  args: { action: stripeAction, open: false },
  decorators: [
    (Story) => (
      <StripeProvider stripe={idleStripe.stripe}>
        <Story />
      </StripeProvider>
    ),
  ],
  play: async ({ args }) => {
    await expect(idleStripe.handleNextAction).not.toHaveBeenCalled();
    await expect(args.onSettled).not.toHaveBeenCalled();
  },
};
