import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import { PaymentEmptyState } from "./payment-empty-state";

const meta: Meta<typeof PaymentEmptyState> = {
  title: "Features/Account/PaymentEmptyState",
  component: PaymentEmptyState,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: { onAdd: fn() },
} satisfies Meta<typeof PaymentEmptyState>;

export default meta;

type Story = StoryObj<typeof PaymentEmptyState>;

// CARD-01 AC 1: the decorative illustration, the heading, the copy and the
// "Add new card" button.
export const Default: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    await expect(
      canvas.getByRole("heading", { name: "You haven’t added a card yet!" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Add one now so you can complete your payment and get your ticket",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add new card" }),
    ).toBeVisible();

    const illustration = canvasElement.querySelector("img");
    await expect(illustration).not.toBeNull();
    await expect(illustration).toHaveAttribute("alt", "");
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(args.onAdd).not.toHaveBeenCalled();
  },
};

// CARD-01 AC 2: activating "Add new card" asks the view to open the form,
// once.
export const AddCallsOnAdd: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add new card" }));
    await expect(args.onAdd).toHaveBeenCalledTimes(1);
  },
};
