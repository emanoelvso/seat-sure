import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { NotificationsEmptyState } from "./notifications-empty-state";

const meta: Meta<typeof NotificationsEmptyState> = {
  title: "Features/Account/NotificationsEmptyState",
  component: NotificationsEmptyState,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof NotificationsEmptyState>;

export default meta;

type Story = StoryObj<typeof NotificationsEmptyState>;

// NOTIF-05 (View AC 1): the decorative bell, the heading, the text and the
// "Browse Events" link to /events.
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { name: "No notification here!" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("It seems there are no notifications at the moment."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse Events" }),
    ).toHaveAttribute("href", "/events");

    const bell = canvasElement.querySelector("img");
    await expect(bell).not.toBeNull();
    await expect(bell).toHaveAttribute("alt", "");
    await expect(bell?.getAttribute("src")).toContain("notifications-empty");
  },
};
