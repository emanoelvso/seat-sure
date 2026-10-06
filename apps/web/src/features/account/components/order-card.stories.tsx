import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  accountOrderSummary,
  canceledOrder,
  completedOrder,
  pendingOrder,
} from "@/testing/account-orders.fixture";
import { OrderCard } from "./order-card";

const meta: Meta<typeof OrderCard> = {
  title: "Features/Account/OrderCard",
  component: OrderCard,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: { order: completedOrder },
} satisfies Meta<typeof OrderCard>;

export default meta;

type Story = StoryObj<typeof OrderCard>;

// ORDLIST-03 AC 6 and 13: every field of a completed order, and the link to
// its detail page.
export const Completed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Adele Concert")).toBeVisible();
    await expect(canvas.getByText("# 3F2A9C1B")).toBeVisible();
    await expect(canvas.getByText("Completed")).toBeVisible();
    await expect(canvas.getByText("Order Date")).toBeVisible();
    await expect(canvas.getByText("Tue 30 Sep • 7:30 PM")).toBeVisible();
    await expect(canvas.getByText("Total paid")).toBeVisible();
    await expect(canvas.getByText("$200")).toBeVisible();
    await expect(canvas.getByText("2 tickets")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Ticket Details" }),
    ).toHaveAttribute(
      "href",
      "/account/tickets/3f2a9c1b-7d4e-4a2b-9c1d-2e3f4a5b6c7d",
    );
  },
};

// ORDLIST-03 AC 6 and 13: a canceled order reads "Canceled", its total keeps
// the cents, and it links to its detail page.
export const Canceled: Story = {
  args: { order: canceledOrder },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Canceled")).toBeVisible();
    await expect(canvas.getByText("$125.50")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Ticket Details" }),
    ).toHaveAttribute(
      "href",
      "/account/tickets/8b1e4d7a-2c3f-4e5a-8b9c-0d1e2f3a4b5c",
    );
  },
};

// ORDLIST-03 AC 14: a pending order resumes checkout.
export const Pending: Story = {
  args: { order: pendingOrder },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pending")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Ticket Details" }),
    ).toHaveAttribute("href", "/checkout/c4d5e6f7-1a2b-4c3d-9e8f-7a6b5c4d3e2f");
  },
};

// Edge case: an order with one seat reads "1 ticket".
export const OneTicket: Story = {
  args: { order: accountOrderSummary({ quantity: 1 }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 ticket")).toBeVisible();
    await expect(canvas.queryByText("1 tickets")).toBeNull();
  },
};
