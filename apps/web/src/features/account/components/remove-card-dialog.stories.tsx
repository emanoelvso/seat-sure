import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { RemoveCardDialog } from "./remove-card-dialog";

// A trigger that owns `open`, like SavedCard will.
function DialogWithTrigger(
  props: React.ComponentProps<typeof RemoveCardDialog>,
) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <RemoveCardDialog
        {...props}
        open={open}
        onCancel={() => {
          props.onCancel();
          setOpen(false);
        }}
        onConfirm={() => {
          props.onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof RemoveCardDialog> = {
  title: "Features/Account/RemoveCardDialog",
  component: RemoveCardDialog,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    open: true,
    brand: "visa",
    last4: "4242",
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof RemoveCardDialog>;

export default meta;

type Story = StoryObj<typeof RemoveCardDialog>;

// CARD-10 AC 5: the title, the card line, and the two buttons; focus moves
// into the dialog.
export const Open: Story = {
  play: async ({ canvas }) => {
    const dialog = await canvas.findByRole("dialog", {
      name: "Remove this card?",
    });
    await expect(dialog).toBeVisible();
    await expect(
      canvas.getByText("Visa •••• 4242 will be removed from your account."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Remove" })).toBeVisible();
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

export const Closed: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

// CARD-10 AC 6: "Cancel" asks to close and confirms nothing.
export const Cancel: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Cancel" }),
    );
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

// CARD-10 AC 7: "Remove" confirms.
export const Confirm: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Remove" }),
    );
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

// Escape behaves like "Cancel": the browser's `cancel` event (what Escape
// fires on a modal dialog) asks to close and is not allowed to close it
// itself. Synthetic key events never reach it, so the event is dispatched.
export const EscapeCancels: Story = {
  play: async ({ canvas, args }) => {
    const dialog = await canvas.findByRole("dialog");
    const event = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(event);

    await expect(event.defaultPrevented).toBe(true);
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

// While the action runs both buttons are disabled and Remove reads
// "Removing…".
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    await canvas.findByRole("dialog");
    await expect(
      canvas.getByRole("button", { name: "Removing…" }),
    ).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeDisabled();
  },
};

// Focus moves into the dialog on open and returns to the trigger on cancel.
export const FocusMovesInAndReturns: Story = {
  args: { open: false },
  render: (args) => <DialogWithTrigger {...args} />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(trigger);

    const dialog = await canvas.findByRole("dialog", {
      name: "Remove this card?",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};
