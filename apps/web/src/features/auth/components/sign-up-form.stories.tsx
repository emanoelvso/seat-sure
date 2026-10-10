import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { SignUpFormState } from "@/features/auth/api/sign-up-action";
import { SignUpForm } from "./sign-up-form";

const meta: Meta<typeof SignUpForm> = {
  // TODO(a11y): color-contrast, link-in-text-block still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Features/Auth/SignUpForm",
  tags: ["autodocs"],
  component: SignUpForm,
} satisfies Meta<typeof SignUpForm>;

export default meta;

type Story = StoryObj<typeof SignUpForm>;

const emptyState: SignUpFormState = { values: {}, fieldErrors: {} };

// AUTH-01: the fields, the unchecked checkbox, the button, and the sign-in
// link all render with the spec's exact copy.
export const Default: Story = {
  args: {
    action: fn(async () => emptyState),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Name")).toBeVisible();
    await expect(canvas.getByLabelText("Last name")).toBeVisible();
    await expect(canvas.getByLabelText("Email")).toBeVisible();
    await expect(canvas.getByLabelText("Password")).toBeVisible();

    const rememberMe = canvas.getByRole("checkbox", { name: "Remember me" });
    await expect(rememberMe).toHaveAttribute("aria-checked", "false");

    await expect(
      canvas.getByRole("button", { name: "Sign up" }),
    ).toBeVisible();

    const signInLink = canvas.getByRole("link", { name: "Sign in" });
    await expect(signInLink).toHaveAttribute("href", "/login");
    await expect(canvas.getByText("Have a SeatSure account?")).toBeVisible();
  },
};

// AUTH-06..10: every field error shows under its own field after a submit.
export const FieldErrors: Story = {
  args: {
    action: fn(
      async (): Promise<SignUpFormState> => ({
        values: { firstName: "", lastName: "", email: "not-an-email" },
        fieldErrors: {
          firstName: "Enter your name.",
          lastName: "Enter your last name.",
          email: "Enter a valid email address.",
          password: "Password must be between 8 and 72 characters.",
        },
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign up" }));

    await expect(canvas.getByText("Enter your name.")).toBeVisible();
    await expect(canvas.getByText("Enter your last name.")).toBeVisible();
    await expect(canvas.getByText("Enter a valid email address.")).toBeVisible();
    await expect(
      canvas.getByText("Password must be between 8 and 72 characters."),
    ).toBeVisible();

    await expect(canvas.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

// AUTH-12: an unexpected failure shows one message above the button.
export const FormError: Story = {
  args: {
    action: fn(
      async (): Promise<SignUpFormState> => ({
        values: {},
        fieldErrors: {},
        formError: "Something went wrong. Please try again.",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Sign up" }));

    await expect(
      canvas.getByText("Something went wrong. Please try again."),
    ).toBeVisible();
  },
};

// Submits every field the action needs, including the hidden redirectTo and
// the checkbox's "on" value (L-001: distinct, recognizable fixture values).
export const SubmitsAllFields: Story = {
  args: {
    redirectTo: "/events",
    action: fn(async () => emptyState),
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Name"), "Thandiwe");
    await userEvent.type(canvas.getByLabelText("Last name"), "Nkosi");
    await userEvent.type(
      canvas.getByLabelText("Email"),
      "thandiwe.nkosi@example.com",
    );
    await userEvent.type(canvas.getByLabelText("Password"), "gr8-s3cret!");
    await userEvent.click(canvas.getByRole("checkbox", { name: "Remember me" }));

    await userEvent.click(canvas.getByRole("button", { name: "Sign up" }));

    await expect(args.action).toHaveBeenCalledTimes(1);
    const formData = (args.action as unknown as { mock: { calls: [unknown, FormData][] } })
      .mock.calls[0][1];
    expect(Object.fromEntries(formData.entries())).toEqual({
      firstName: "Thandiwe",
      lastName: "Nkosi",
      email: "thandiwe.nkosi@example.com",
      password: "gr8-s3cret!",
      rememberMe: "on",
      redirectTo: "/events",
    });
  },
};
