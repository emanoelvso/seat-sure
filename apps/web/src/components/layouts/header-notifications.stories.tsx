import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { HeaderNotifications } from "./header-notifications";
import { NOTIFICATIONS_CHANGED } from "@/utils/notification-events";

function stubCount(unread: number) {
  const previous = window.fetch;
  const fetcher = fn(async () => Response.json({ unread }));
  window.fetch = fetcher;
  return { fetcher, restore: () => { window.fetch = previous; } };
}

const meta = {
  title: "Components/HeaderNotifications",
  component: HeaderNotifications,
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof HeaderNotifications>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unread: Story = {
  beforeEach: () => stubCount(3).restore,
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", { name: "Notifications, 3 unread" });
    await expect(link).toHaveAttribute("href", "/account/notifications");
    await expect(canvas.getByText("3")).toBeVisible();
  },
};
export const NoneUnread: Story = {
  beforeEach: () => stubCount(0).restore,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/account/notifications");
    await expect(canvas.queryByText("0")).toBeNull();
  },
};
export const LargeCount: Story = {
  beforeEach: () => stubCount(120).restore,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Notifications, 120 unread" })).toBeVisible();
    await expect(canvas.getByText("99+")).toBeVisible();
  },
};
export const RefreshAfterRead: Story = {
  beforeEach: () => {
    const { fetcher, restore } = stubCount(4);
    fetcher.mockResolvedValueOnce(Response.json({ unread: 4 })).mockResolvedValue(Response.json({ unread: 0 }));
    return restore;
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Notifications, 4 unread" })).toBeVisible();
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    await waitFor(() => expect(canvas.getByRole("link", { name: "Notifications" })).toBeVisible());
    await expect(canvas.queryByText("4")).toBeNull();
  },
};
export const RefreshOnFocus: Story = {
  beforeEach: () => {
    const { fetcher, restore } = stubCount(1);
    fetcher.mockResolvedValueOnce(Response.json({ unread: 1 })).mockResolvedValue(Response.json({ unread: 2 }));
    return restore;
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("link", { name: "Notifications, 1 unread" });
    window.dispatchEvent(new Event("focus"));
    await expect(await canvas.findByRole("link", { name: "Notifications, 2 unread" })).toBeVisible();
  },
};
export const Unavailable: Story = {
  beforeEach: () => {
    const { fetcher, restore } = stubCount(0);
    fetcher.mockRejectedValue(new Error("Offline"));
    return restore;
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/account/notifications");
    await expect(canvas.queryByText("0")).toBeNull();
  },
};
