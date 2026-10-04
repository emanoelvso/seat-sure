import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "next/navigation";
import { expect, fn, mocked } from "storybook/test";
import type { ResetPasswordFormState } from "@/features/auth/api/reset-password-action";
import { ResetPasswordForm } from "./reset-password-form";

const meta: Meta<typeof ResetPasswordForm> = {
  title: "Features/Auth/ResetPasswordForm",
  tags: ["autodocs"],
  component: ResetPasswordForm,
  parameters: {
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;

type Story = StoryObj<typeof ResetPasswordForm>;

const emptyState: ResetPasswordFormState = { fieldErrors: {} };

// AUTH-61: both password fields and the "Reset password" button render.
export const Default: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("New Password")).toBeVisible();
    await expect(
      canvas.getByLabelText("Re-enter New Password"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Reset password" }),
    ).toBeVisible();
  },
};

// AUTH-62, AUTH-63: each field shows its own error under itself.
export const FieldErrors: Story = {
  args: {
    action: fn(
      async (): Promise<ResetPasswordFormState> => ({
        fieldErrors: {
          newPassword: "Password must be between 8 and 72 characters.",
          confirmPassword: "Passwords don't match.",
        },
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset password" }),
    );

    await expect(
      canvas.getByText("Password must be between 8 and 72 characters."),
    ).toBeVisible();
    await expect(canvas.getByText("Passwords don't match.")).toBeVisible();
    await expect(canvas.getByLabelText("New Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      canvas.getByLabelText("Re-enter New Password"),
    ).toHaveAttribute("aria-invalid", "true");
  },
};

// AUTH-67: a successful reset opens the success dialog.
export const SuccessOpensDialog: Story = {
  args: {
    action: fn(
      async (): Promise<ResetPasswordFormState> => ({
        fieldErrors: {},
        status: "success",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset password" }),
    );

    await expect(
      canvas.getByRole("dialog", { name: "Password Changed Successfully" }),
    ).toBeVisible();
  },
};

// AUTH-68: a "restart" failure's "Try again" navigates to /forgot-password.
export const RestartFailureNavigates: Story = {
  args: {
    action: fn(
      async (): Promise<ResetPasswordFormState> => ({
        fieldErrors: {},
        status: "failed",
        retry: "restart",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset password" }),
    );

    const dialog = canvas.getByRole("dialog", {
      name: "Password Change Failed",
    });
    await expect(dialog).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    const router = mocked(useRouter).mock.results.at(-1)?.value;
    await expect(router.push).toHaveBeenCalledWith("/forgot-password");
  },
};

// AUTH-69: a "stay" failure's "Try again" just closes the dialog, keeping
// the typed values (L-001: distinct values per field so a mix-up would
// show).
export const StayFailureKeepsForm: Story = {
  args: {
    action: fn(
      async (): Promise<ResetPasswordFormState> => ({
        fieldErrors: {},
        status: "failed",
        retry: "stay",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const newPassword = canvas.getByLabelText("New Password");
    const confirmPassword = canvas.getByLabelText("Re-enter New Password");

    await userEvent.type(newPassword, "fresh-pass-1");
    await userEvent.type(confirmPassword, "fresh-pass-2");
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset password" }),
    );

    const dialog = canvas.getByRole("dialog", {
      name: "Password Change Failed",
    }) as HTMLDialogElement;
    await expect(dialog).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(dialog.open).toBe(false);
    await expect(newPassword).toHaveValue("fresh-pass-1");
    await expect(confirmPassword).toHaveValue("fresh-pass-2");
  },
};
