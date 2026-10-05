import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PasswordField } from "./password-field";

const meta: Meta<typeof PasswordField> = {
  title: "Features/Auth/PasswordField",
  tags: ["autodocs"],
  component: PasswordField,
  args: {
    label: "Password",
    name: "password",
  },
} satisfies Meta<typeof PasswordField>;

export default meta;

type Story = StoryObj<typeof PasswordField>;

// AUTH-30: the field starts masked, and the eye button toggles both the
// input's type and its own accessible name.
export const ToggleVisibility: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Password");
    await expect(input).toHaveAttribute("type", "password");

    const showButton = canvas.getByRole("button", { name: "Show password" });
    await showButton.click();

    await expect(input).toHaveAttribute("type", "text");
    await expect(
      canvas.getByRole("button", { name: "Hide password" }),
    ).toBeVisible();

    await canvas.getByRole("button", { name: "Hide password" }).click();

    await expect(input).toHaveAttribute("type", "password");
    await expect(
      canvas.getByRole("button", { name: "Show password" }),
    ).toBeVisible();
  },
} satisfies Story;

export const WithError: Story = {
  args: {
    variant: "error",
    supportingText: "Enter at least 8 characters.",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Enter at least 8 characters."),
    ).toBeVisible();
    const input = canvas.getByLabelText("Password");
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
} satisfies Story;
