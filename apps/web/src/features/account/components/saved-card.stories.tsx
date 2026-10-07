import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import { SavedCard } from "./saved-card";

const card: PaymentCard = {
  __typename: "PaymentCard",
  id: "card-1",
  brand: "visa",
  last4: "8557",
  expMonth: 8,
  expYear: 2030,
  holder: "Negar Khosravi",
  isDefault: false,
  expired: false,
};

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof SavedCard> = {
  title: "Features/Account/SavedCard",
  component: SavedCard,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    card,
    onSetDefault: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof SavedCard>;

export default meta;

type Story = StoryObj<typeof SavedCard>;

const triggerName = "Card options for Visa ending in 8557";

// CARD-01 AC 4-6: a plain saved card shows its visual and neither badge.
export const Plain: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("•••• •••• •••• 8557")).toBeVisible();
    await expect(canvas.getByText("Negar Khosravi")).toBeVisible();
    await expect(canvas.getByText("08 / 30")).toBeVisible();
    await expect(canvas.queryByText("Default")).toBeNull();
    await expect(canvas.queryByText("Expired")).toBeNull();
    await expect(
      canvas.getByRole("button", { name: triggerName }),
    ).toBeVisible();
  },
};

// CARD-01 AC 5: the default card shows "Default" and not "Expired".
export const DefaultCard: Story = {
  args: { card: { ...card, isDefault: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Default")).toBeVisible();
    await expect(canvas.queryByText("Expired")).toBeNull();
  },
};

// CARD-01 AC 6: an expired card shows "Expired" and not "Default".
export const ExpiredCard: Story = {
  args: {
    card: { ...card, expMonth: 1, expYear: 2024, expired: true },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Expired")).toBeVisible();
    await expect(canvas.queryByText("Default")).toBeNull();
    await expect(canvas.getByText("01 / 24")).toBeVisible();
  },
};

// Both flags: both badges.
export const DefaultAndExpired: Story = {
  args: {
    card: { ...card, isDefault: true, expired: true },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Default")).toBeVisible();
    await expect(canvas.getByText("Expired")).toBeVisible();
  },
};

// CARD-10 AC 4: "Set as default" calls onSetDefault with the card's id.
export const SetDefault: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Set as default" }),
    );

    await expect(args.onSetDefault).toHaveBeenCalledWith("card-1");
    await expect(args.onRemove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};

// CARD-10 AC 5-6: "Remove" opens the dialog; "Cancel" closes it and removes
// nothing.
export const RemoveThenCancel: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove" }),
    );

    const dialog = await canvas.findByRole("dialog", {
      name: "Remove this card?",
    });
    await expect(
      canvas.getByText("Visa •••• 8557 will be removed from your account."),
    ).toBeVisible();
    await expect(args.onRemove).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(args.onRemove).not.toHaveBeenCalled();
  },
};

// CARD-10 AC 7: confirming calls onRemove with the card's id and closes the
// dialog.
export const RemoveThenConfirm: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove" }),
    );

    const dialog = await canvas.findByRole("dialog", {
      name: "Remove this card?",
    });
    await userEvent.click(canvas.getByRole("button", { name: "Remove" }));

    await expect(args.onRemove).toHaveBeenCalledWith("card-1");
    await expect(args.onSetDefault).not.toHaveBeenCalled();
    await waitFor(() => expect(dialog).not.toBeVisible());
  },
};

// While onRemove runs the dialog reads "Removing…" and its buttons are
// disabled.
export const RemovePending: Story = {
  args: { onRemove: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Remove" }),
    );

    await expect(
      await canvas.findByRole("button", { name: "Removing…" }),
    ).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeDisabled();
  },
};
