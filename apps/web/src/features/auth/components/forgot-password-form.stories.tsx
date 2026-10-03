import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { RequestPasswordResetFormState } from "@/features/auth/api/request-password-reset-action";
import { ForgotPasswordForm } from "./forgot-password-form";

const meta: Meta<typeof ForgotPasswordForm> = {
  title: "Features/Auth/ForgotPasswordForm",
  tags: ["autodocs"],
  component: ForgotPasswordForm,
} satisfies Meta<typeof ForgotPasswordForm>;

export default meta;

type Story = StoryObj<typeof ForgotPasswordForm>;

const emptyState: RequestPasswordResetFormState = { values: {}, fieldErrors: {} };

// AUTH-56: the Email field and "Get verification code" button render.
export const Default: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Email")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Get verification code" }),
    ).toBeVisible();
  },
};

// AUTH-59: an invalid email shows "Enter a valid email address." inline.
export const InvalidEmail: Story = {
  args: {
    action: fn(
      async (): Promise<RequestPasswordResetFormState> => ({
        values: { email: "not-an-email" },
        fieldErrors: { email: "Enter a valid email address." },
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Get verification code" }),
    );

    await expect(
      canvas.getByText("Enter a valid email address."),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

// Submits the email the action needs.
export const SubmitsEmail: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(
      canvas.getByLabelText("Email"),
      "thandiwe.nkosi@example.com",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Get verification code" }),
    );

    await expect(args.action).toHaveBeenCalledTimes(1);
    const formData = (args.action as unknown as { mock: { calls: [unknown, FormData][] } })
      .mock.calls[0][1];
    expect(Object.fromEntries(formData.entries())).toEqual({
      email: "thandiwe.nkosi@example.com",
    });
  },
};
