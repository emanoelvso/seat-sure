import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { ResetResultDialog } from "./reset-result-dialog";

type Canvas = ReturnType<typeof within>;

const dialog = (canvas: Canvas, name: string) =>
  canvas.getByRole("dialog", { name }) as HTMLDialogElement;

const meta: Meta<typeof ResetResultDialog> = {
  // TODO(a11y): color-contrast (neutral-300 text) still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Features/Auth/ResetResultDialog",
  tags: ["autodocs"],
  component: ResetResultDialog,
  args: {
    open: true,
    onRetry: fn(),
  },
} satisfies Meta<typeof ResetResultDialog>;

export default meta;

type Story = StoryObj<typeof ResetResultDialog>;

// AUTH-67: success shows the title, body, a "Log in" link to /login, and a
// decorative image.
export const Success: Story = {
  args: { status: "success" },
  play: async ({ canvas }) => {
    const modal = dialog(canvas, "Password Changed Successfully");
    const inDialog = within(modal);

    await expect(modal.open).toBe(true);
    await expect(
      inDialog.getByText(
        "You can now go back to the login page and log in with your new password.",
      ),
    ).toBeVisible();

    const logIn = inDialog.getByRole("link", { name: "Log in" });
    await expect(logIn).toHaveAttribute("href", "/login");

    // A decorative image (alt="") has no accessible "img" role, so it's
    // queried directly instead of via getByRole.
    await expect(inDialog.getAllByAltText("")[0]).toBeVisible();
  },
};

// AUTH-68, AUTH-69: failure shows the title, body, and "Try again" calling
// onRetry.
export const Failure: Story = {
  args: { status: "failure" },
  play: async ({ canvas, args, userEvent }) => {
    const modal = dialog(canvas, "Password Change Failed");
    const inDialog = within(modal);

    await expect(modal.open).toBe(true);
    await expect(
      inDialog.getByText("There was a problem changing your password."),
    ).toBeVisible();
    await expect(inDialog.getAllByAltText("")[0]).toBeVisible();

    await userEvent.click(inDialog.getByRole("button", { name: "Try again" }));

    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
