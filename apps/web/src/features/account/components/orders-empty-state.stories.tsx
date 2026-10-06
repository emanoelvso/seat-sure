import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { OrdersEmptyState } from "./orders-empty-state";

const meta: Meta<typeof OrdersEmptyState> = {
  title: "Features/Account/OrdersEmptyState",
  component: OrdersEmptyState,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof OrdersEmptyState>;

export default meta;

type Story = StoryObj<typeof OrdersEmptyState>;

// ORDEMPTY-01 AC 1: the decorative illustration, the heading, the copy and
// the "Browse Events" link to /events.
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { name: "ooops!!!" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "You haven't booked any tickets yet. Explore exciting events and secure your spot now!",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse Events" }),
    ).toHaveAttribute("href", "/events");

    const illustration = canvasElement.querySelector("img");
    await expect(illustration).not.toBeNull();
    await expect(illustration).toHaveAttribute("alt", "");
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};
