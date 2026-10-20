import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import type { DeleteAccountResult } from "@/features/account/api/delete-account-action";
import { DeleteAccountSection } from "./delete-account-section";

const action = fn<(confirmation: string) => Promise<DeleteAccountResult>>();
const ACTIVE_ORDERS_MESSAGE =
  "You can't delete your account while you have an order in progress or tickets for an upcoming event.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta = {
  title: "Features/Account/DeleteAccountSection",
  component: DeleteAccountSection,
  parameters: { a11y: { test: "error" } },
  args: { action },
  beforeEach: () => {
    action.mockReset();
  },
  decorators: [
    (Story) => (
      <div className="w-[1128px] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeleteAccountSection>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story["play"]>>[0];

// The section's own trigger is the only "Delete account" button until the
// dialog opens; afterwards the dialog's confirm button shares the name.
async function openAndConfirm({ canvas, userEvent }: PlayContext) {
  await userEvent.click(canvas.getByRole("button", { name: "Delete account" }));
  const dialog = await canvas.findByRole("dialog", {
    name: "Delete your account?",
  });
  await userEvent.type(
    within(dialog).getByRole("textbox", { name: "Type DELETE to confirm" }),
    "DELETE",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Delete account" }),
  );
  return dialog;
}

// WEB AC 1: the section, its heading and the destructive button; no dialog yet.
export const Section: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Delete account" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Delete account" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("dialog")).toBeNull();
    // Destructive: the error-500 token (#850d06), not the primary colour
    await expect(
      getComputedStyle(canvas.getByRole("button", { name: "Delete account" }))
        .backgroundColor,
    ).toBe("rgb(133, 13, 6)");
  },
};

// WEB AC 2, 3: the button opens the dialog, with confirm disabled.
export const OpensTheDialog: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete account" }),
    );
    const dialog = await canvas.findByRole("dialog", {
      name: "Delete your account?",
    });
    await expect(dialog).toBeVisible();
    await expect(
      within(dialog).getByRole("button", { name: "Delete account" }),
    ).toBeDisabled();
    await expect(action).not.toHaveBeenCalled();
  },
};

// WEB AC 5: the active-orders refusal keeps the dialog open with its message.
export const ActiveOrdersError: Story = {
  play: async (context) => {
    action.mockResolvedValue({ error: ACTIVE_ORDERS_MESSAGE });
    const dialog = await openAndConfirm(context);

    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      ACTIVE_ORDERS_MESSAGE,
    );
    await expect(action).toHaveBeenCalledTimes(1);
    await expect(action).toHaveBeenCalledWith("DELETE");
    await expect(dialog).toBeVisible();
  },
};

// WEB AC 6: any other failure keeps the dialog open with the generic message.
export const GenericError: Story = {
  play: async (context) => {
    action.mockResolvedValue({ error: GENERIC_ERROR });
    const dialog = await openAndConfirm(context);

    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      GENERIC_ERROR,
    );
    await expect(dialog).toBeVisible();
  },
};

// WEB AC 6: a transport failure (the action throws) shows the generic message.
export const ThrownErrorShowsTheGenericMessage: Story = {
  play: async (context) => {
    action.mockRejectedValue(new Error("Network unavailable"));
    const dialog = await openAndConfirm(context);

    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      GENERIC_ERROR,
    );
    await expect(dialog).toBeVisible();
  },
};

// WEB AC 7: while the action is in flight both dialog buttons are disabled.
export const PendingWhileTheActionRuns: Story = {
  play: async (context) => {
    action.mockReturnValue(new Promise(() => {}));
    const dialog = await openAndConfirm(context);

    await expect(
      await within(dialog).findByRole("button", { name: "Deleting…" }),
    ).toBeDisabled();
    await expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
  },
};

// WEB AC 8: cancel closes the dialog without calling the action.
export const CancelClosesWithoutCallingTheAction: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete account" }),
    );
    const dialog = await canvas.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );

    await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
    await expect(action).not.toHaveBeenCalled();
  },
};
