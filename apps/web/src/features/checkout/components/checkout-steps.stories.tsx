import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CheckoutSteps } from "./checkout-steps";

const meta: Meta<typeof CheckoutSteps> = {
  title: "Features/Checkout/CheckoutSteps",
  tags: ["autodocs"],
  component: CheckoutSteps,
} satisfies Meta<typeof CheckoutSteps>;

export default meta;

type Story = StoryObj<typeof CheckoutSteps>;

// PAY-04/PAY-18/PAY-24/PAY-33: exactly one step is marked current, named
// right, and no step is a link - "Back" is the only way to move back.
function currentSteps(canvasElement: HTMLElement) {
  return Array.from(canvasElement.querySelectorAll('[aria-current="step"]'));
}

export const Tickets: Story = {
  args: { current: "tickets" },
  play: async ({ canvas, canvasElement }) => {
    const current = currentSteps(canvasElement);
    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveTextContent("Tickets");

    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};

export const Payment: Story = {
  args: { current: "payment" },
  play: async ({ canvas, canvasElement }) => {
    const current = currentSteps(canvasElement);
    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveTextContent("Payment");

    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};

export const Review: Story = {
  args: { current: "review" },
  play: async ({ canvas, canvasElement }) => {
    const current = currentSteps(canvasElement);
    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveTextContent("Review");

    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};
