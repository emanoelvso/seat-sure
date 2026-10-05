import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PaymentSuccess } from "./payment-success";

const meta: Meta<typeof PaymentSuccess> = {
  title: "Features/Checkout/PaymentSuccess",
  tags: ["autodocs"],
  component: PaymentSuccess,
  args: { email: "negar.khosravi@example.com" },
} satisfies Meta<typeof PaymentSuccess>;

export default meta;

type Story = StoryObj<typeof PaymentSuccess>;

// PAY-54: the exact copy, the account email and "Back to home" to "/".
// Spec Assumptions, "Success page": no "Go to profile".
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Thank You!" }),
    ).toBeVisible();
    await expect(canvas.getByText("Your payment was successful")).toBeVisible();
    await expect(
      canvas.getByText("Your tickets have been sent to:"),
    ).toBeVisible();
    await expect(canvas.getByText("negar.khosravi@example.com")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/");
    await expect(canvas.queryByText(/Go to profile/i)).toBeNull();
  },
};
