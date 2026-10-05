import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { LogInFormState } from "@/features/auth/api/log-in-action";
import { LogInForm } from "./log-in-form";

const meta: Meta<typeof LogInForm> = {
  title: "Features/Auth/LogInForm",
  tags: ["autodocs"],
  component: LogInForm,
} satisfies Meta<typeof LogInForm>;

export default meta;

type Story = StoryObj<typeof LogInForm>;

const emptyState: LogInFormState = { values: {}, fieldErrors: {} };

// AUTH-29: the fields, the unchecked checkbox, the links, and the button all
// render with the spec's exact copy.
export const Default: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Email")).toBeVisible();
    await expect(canvas.getByLabelText("Password")).toBeVisible();

    const rememberMe = canvas.getByRole("checkbox", { name: "Remember me" });
    await expect(rememberMe).toHaveAttribute("aria-checked", "false");

    const forgotPassword = canvas.getByRole("link", {
      name: "Forgot Password?",
    });
    await expect(forgotPassword).toHaveAttribute("href", "/forgot-password");

    await expect(canvas.getByRole("button", { name: "Log in" })).toBeVisible();

    const createAccount = canvas.getByRole("link", { name: "Create account" });
    await expect(createAccount).toHaveAttribute("href", "/signup");
    await expect(canvas.getByText("New to SeatSure?")).toBeVisible();
  },
};

// AUTH-30: the eye button toggles the password field between masked and
// plain text.
export const PasswordToggle: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas }) => {
    const password = canvas.getByLabelText("Password");
    await expect(password).toHaveAttribute("type", "password");

    await canvas.getByRole("button", { name: "Show password" }).click();

    await expect(password).toHaveAttribute("type", "text");
  },
};

// AUTH-37: a field error shows under the field it belongs to.
export const FieldErrors: Story = {
  args: {
    action: fn(
      async (): Promise<LogInFormState> => ({
        values: { email: "" },
        fieldErrors: {
          email: "Enter a valid email address.",
          password: "Enter your password.",
        },
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Log in" }));

    await expect(canvas.getByText("Enter a valid email address.")).toBeVisible();
    await expect(canvas.getByText("Enter your password.")).toBeVisible();
    await expect(canvas.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

// AUTH-33: a form error shows above the button, not under a field.
export const FormError: Story = {
  args: {
    action: fn(
      async (): Promise<LogInFormState> => ({
        values: {},
        fieldErrors: {},
        formError: "Incorrect email or password.",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Log in" }));

    await expect(canvas.getByText("Incorrect email or password.")).toBeVisible();
  },
};
