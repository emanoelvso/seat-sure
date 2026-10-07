import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { PaymentMethodButtons } from "./payment-method-buttons";

const meta: Meta<typeof PaymentMethodButtons> = {
  title: "Features/Account/PaymentMethodButtons",
  component: PaymentMethodButtons,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof PaymentMethodButtons>;

export default meta;

type Story = StoryObj<typeof PaymentMethodButtons>;

// CARD-03 AC 16: the card method is pressed, the other three are disabled.
// Each has an accessible name.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("button")).toHaveLength(4);
    await expect(canvas.getByRole("button", { name: "Card" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const name of ["Apple Pay", "bitpay", "Google Pay"]) {
      const button = canvas.getByRole("button", { name });
      await expect(button).toHaveAttribute("aria-disabled", "true");
      await expect(button).not.toHaveAttribute("aria-pressed");
    }
  },
};

// CARD-03 AC 16: clicking a disabled method changes nothing.
export const DisabledIgnoresClicks: Story = {
  play: async ({ canvas }) => {
    const applePay = canvas.getByRole("button", { name: "Apple Pay" });
    await userEvent.click(applePay);

    await expect(applePay).toHaveAttribute("aria-disabled", "true");
    await expect(applePay).not.toHaveAttribute("aria-pressed");
    await expect(canvas.getByRole("button", { name: "Card" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
