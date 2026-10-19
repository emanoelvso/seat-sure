import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { PaymentChallengeDialog } from "./payment-challenge-dialog";

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
