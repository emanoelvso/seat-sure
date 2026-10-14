import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TicketTotals } from "./ticket-summary";

const meta: Meta<typeof TicketTotals> = {
  title: "Features/Tickets/TicketTotals",
  component: TicketTotals,
  args: {
    unitCents: 45000,
    totalCents: 90000,
    currency: "USD",
    quantity: 2,
  },
} satisfies Meta<typeof TicketTotals>;

export default meta;

type Story = StoryObj<typeof TicketTotals>;

export const PlainPrice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("$450")).toBeVisible();
    await expect(canvas.getByText("/per")).toBeVisible();
    await expect(canvas.getByText("$900")).toBeVisible();
    await expect(canvas.queryByText(/From/)).toBeNull();
  },
};

export const FromPrice: Story = {
  args: { from: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText((_, element) => element?.textContent === "From $450"),
    ).toBeVisible();
    await expect(canvas.getByText("/per")).toBeVisible();
  },
};

// The total is what the caller passes, not unit price times quantity.
export const TotalComesFromTheCaller: Story = {
  args: { unitCents: 45000, totalCents: 105000, quantity: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("$1,050")).toBeVisible();
    await expect(canvas.getByText("$450")).toBeVisible();
  },
};
