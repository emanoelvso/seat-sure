import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { DeleteAccountDialog } from "./delete-account-dialog";

// Confirms like the section does: the click puts the dialog in its pending state.
function PendingAfterConfirm(
  props: React.ComponentProps<typeof DeleteAccountDialog>,
) {
  const [pending, setPending] = useState(false);
  return (
    <DeleteAccountDialog
      {...props}
      pending={pending}
      onConfirm={(confirmation) => {
        props.onConfirm(confirmation);
        setPending(true);
      }}
    />
  );
}

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof DeleteAccountDialog> = {
  title: "Features/Account/DeleteAccountDialog",
  component: DeleteAccountDialog,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    open: true,
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof DeleteAccountDialog>;

export default meta;

type Story = StoryObj<typeof DeleteAccountDialog>;

// WEB AC 2: the dialog says what is deleted and asks for DELETE; the confirm
// button starts disabled.
export const Open: Story = {
  play: async ({ canvas }) => {
    const dialog = await canvas.findByRole("dialog", {
      name: "Delete your account?",
    });
    await expect(dialog).toBeVisible();
    await expect(canvas.getByText("Your account and profile")).toBeVisible();
    await expect(canvas.getByText("Your saved payment cards")).toBeVisible();
    await expect(canvas.getByText("Your notifications")).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "Type DELETE to confirm" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeDisabled();
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

export const Closed: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};

// WEB AC 3: a partial phrase keeps confirm disabled.
export const PartialPhraseKeepsConfirmDisabled: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      "DELET",
    );
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeDisabled();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

// WEB AC 3: the check is case-sensitive.
export const LowercasePhraseKeepsConfirmDisabled: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      "delete",
    );
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeDisabled();
  },
};

// WEB AC 3: the exact phrase enables confirm.
export const ExactPhraseEnablesConfirm: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      "DELETE",
    );
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeEnabled();
  },
};

// WEB AC 3: the phrase is trimmed before the check.
export const TrimmedPhraseEnablesConfirm: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      " DELETE ",
    );
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeEnabled();
  },
};

// WEB AC 4: confirming hands the trimmed phrase to the parent.
export const ConfirmCallsOnConfirm: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      " DELETE ",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete account" }),
    );
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).toHaveBeenCalledWith("DELETE");
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

// WEB AC 8: "Cancel" asks to close and confirms nothing.
export const Cancel: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Cancel" }),
    );
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

// WEB AC 8: Escape behaves like "Cancel": the browser's `cancel` event (what
// Escape fires on a modal dialog) asks to close and is not allowed to close it
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

// WEB AC 7: while the request is in flight both buttons are disabled, the
// confirm button reads "Deleting…", and Escape does not close the dialog.
export const PendingDisablesBothButtons: Story = {
  render: (args) => <PendingAfterConfirm {...args} />,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Type DELETE to confirm" }),
      "DELETE",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete account" }),
    );

    await expect(
      await canvas.findByRole("button", { name: "Deleting…" }),
    ).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeDisabled();

    canvas.getByRole("dialog").dispatchEvent(
      new Event("cancel", { cancelable: true }),
    );
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
};

// WEB AC 5, 6: the error is shown in an alert and the dialog stays open.
export const ShowsTheError: Story = {
  args: { error: "Something went wrong. Please try again." },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    await expect(canvas.getByRole("dialog")).toBeVisible();
  },
};
