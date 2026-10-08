import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within, spyOn } from "storybook/test";
import type { NotificationType } from "@/types/__generated__/schema";
import { env } from "@/config/env";
import { NotificationsView } from "./notifications-view";
import { HeaderNotifications } from "@/components/layouts/header-notifications";

const ERROR = "Something went wrong. Please try again.";
const items = [
  {
    __typename: "Notification" as const,
    id: "welcome",
    type: "WELCOME" as const,
    eventName: null,
    createdAt: "2026-10-08T16:42:00Z",
    readAt: null,
  },
  {
    __typename: "Notification" as const,
    id: "purchase",
    type: "PURCHASE_CONFIRMED" as const,
    eventName: "Rock Fest",
    createdAt: "2026-10-07T16:42:00Z",
    readAt: null,
  },
  {
    __typename: "Notification" as const,
    id: "payment",
    type: "PAYMENT_UNSUCCESSFUL" as const,
    eventName: "Rock Fest",
    createdAt: "2026-10-05T16:42:00Z",
    readAt: "2026-10-06T00:00:00Z",
  },
];
const data = {
  __typename: "NotificationsPage" as const,
  items,
  counts: {
    __typename: "NotificationCounts" as const,
    all: 3,
    unread: 2,
    read: 1,
  },
  page: 1,
  totalPages: 1,
};
const meta: Meta<typeof NotificationsView> = {
  beforeEach: () => {
    const zone = spyOn(env, "timeZone", "get").mockReturnValue("UTC");
    return () => zone.mockRestore();
  },
  title: "Features/Account/NotificationsView",
  component: NotificationsView,
  parameters: { a11y: { test: "error" } },
  args: {
    data,
    params: { tab: "all", page: 1 },
    now: "2026-10-08T22:00:00Z",
    markReadAction: fn(async () => ({ ok: true as const })),
    markAllReadAction: fn(async () => ({
      counts: {
        __typename: "NotificationCounts" as const,
        all: 3,
        unread: 0,
        read: 3,
      },
    })),
  },
} satisfies Meta<typeof NotificationsView>;
export default meta;
type Story = StoryObj<typeof NotificationsView>;

export const Empty: Story = {
  args: {
    data: {
      ...data,
      items: [],
      counts: {
        __typename: "NotificationCounts" as const,
        all: 0,
        unread: 0,
        read: 0,
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "No notification here!" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("navigation", { name: "Notification filter" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: "Mark All as Read" }),
    ).toBeNull();
  },
};
export const ReadOptimistically: Story = {
  args: {
    params: { tab: "unread", page: 1 },
    markReadAction: fn(() => new Promise<never>(() => {})),
  },
  play: async ({ canvas, args }) => {
    const card = canvas.getByRole("button", { name: /Welcome to SeatSure/ });
    await userEvent.dblClick(card);
    await expect(within(card).queryByText("Unread")).toBeNull();
    await expect(
      canvas.getByRole("link", { name: "Unread (1)" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("link", { name: "Read (2)" })).toBeVisible();
    await expect(card).toBeVisible();
    await expect(args.markReadAction).toHaveBeenCalledWith("welcome");
    await expect(args.markReadAction).toHaveBeenCalledTimes(1);
  },
};
export const AlreadyRead: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Your payment was unsuccessful/ }),
    );
    await expect(args.markReadAction).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole("link", { name: "Unread (2)" }),
    ).toBeVisible();
  },
};
export const ReadFailure: Story = {
  args: { markReadAction: fn(async () => ({ error: ERROR })) },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("button", { name: /Welcome to SeatSure/ });
    await userEvent.click(card);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(ERROR);
    await expect(within(card).getByText("Unread")).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Unread (2)" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Read (1)" })).toBeVisible();
  },
};
export const MarkAllOptimistically: Story = {
  args: { markAllReadAction: fn(() => new Promise<never>(() => {})) },
  play: async ({ canvas, args }) => {
    await userEvent.dblClick(
      canvas.getByRole("button", { name: "Mark All as Read" }),
    );
    await expect(canvas.queryAllByText("Unread")).toHaveLength(0);
    await expect(
      canvas.getByRole("link", { name: "Unread (0)" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Read (3)" })).toBeVisible();
    await expect(args.markAllReadAction).toHaveBeenCalledTimes(1);
  },
};
export const MarkAllSuccess: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Mark All as Read" }),
    );
    await waitFor(() =>
      expect(args.markAllReadAction).toHaveBeenCalledTimes(1),
    );
    await expect(canvas.getByRole("link", { name: "Read (3)" })).toBeVisible();
    await expect(canvas.queryAllByText("Unread")).toHaveLength(0);
  },
};
export const MarkAllFailure: Story = {
  args: { markAllReadAction: fn(async () => ({ error: ERROR })) },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Mark All as Read" }),
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(ERROR);
    await expect(canvas.getAllByText("Unread")).toHaveLength(2);
    await expect(
      canvas.getByRole("link", { name: "Unread (2)" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Read (1)" })).toBeVisible();
  },
};
export const EmptyUnread: Story = {
  args: {
    data: {
      ...data,
      items: [],
      counts: {
        __typename: "NotificationCounts" as const,
        all: 3,
        unread: 0,
        read: 3,
      },
    },
    params: { tab: "unread", page: 1 },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("You’re all caught up.")).toBeVisible();
    const button = canvas.getByRole("button", { name: "Mark All as Read" });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    await expect(args.markAllReadAction).not.toHaveBeenCalled();
  },
};
export const EmptyRead: Story = {
  args: { data: { ...data, items: [] }, params: { tab: "read", page: 1 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No read notifications yet.")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Mark All as Read" }),
    ).toBeNull();
  },
};
export const UnknownAndTimestamps: Story = {
  args: {
    data: {
      ...data,
      items: [
        ...items,
        { ...items[0], id: "future", type: "FUTURE" as NotificationType },
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas
        .getAllByRole("listitem")
        .filter((li) => within(li).queryByRole("button")),
    ).toHaveLength(3);
    await expect(canvas.getByText("Today at 4:42 PM")).toBeVisible();
    await expect(canvas.getByText("Yesterday at 4:42 PM")).toBeVisible();
    await expect(canvas.getByText("Oct 5 at 4:42 PM")).toBeVisible();
  },
};
export const Paginated: Story = {
  args: {
    data: { ...data, totalPages: 2 },
    params: { tab: "unread", page: 1 },
  },
  play: async ({ canvas }) => {
    const pagination = within(
      canvas.getByRole("navigation", { name: "Pagination" }),
    );
    await expect(pagination.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/account/notifications?tab=unread&page=2",
    );
    await expect(
      pagination.getByRole("link", { name: "Next page" }),
    ).toHaveAttribute("href", "/account/notifications?tab=unread&page=2");
    await expect(pagination.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

export const ReadSuccess: Story = {
  play: async ({ canvas, args }) => {
    const card = canvas.getByRole("button", { name: /Welcome to SeatSure/ });
    await userEvent.click(card);
    await waitFor(() =>
      expect(args.markReadAction).toHaveBeenCalledWith("welcome"),
    );
    await expect(within(card).queryByText("Unread")).toBeNull();
    await expect(
      canvas.getByRole("link", { name: "Unread (1)" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Read (2)" })).toBeVisible();
    await userEvent.click(card);
    await expect(args.markReadAction).toHaveBeenCalledTimes(1);
  },
};

// Mark all AC1: the double-check is decorative (the button has the text
// name), visibly rendered at Figma 5011:121416's 24px on both shown tabs.
export const MarkAllIconOnAll: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Mark All as Read" });
    const icon = button.querySelector("svg");
    await expect(icon).not.toBeNull();
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon?.getBoundingClientRect().width).toBe(24);
    await expect(icon?.getBoundingClientRect().height).toBe(24);
    await expect(icon?.querySelectorAll("path")).toHaveLength(2);
    await expect(icon?.querySelector("path")?.getAttribute("d")).toContain(
      "M15.4933 6.93502",
    );
    await expect(
      icon?.querySelectorAll("path")[1]?.getAttribute("d"),
    ).toContain("M20.5175 7.01946");
  },
};

export const MarkAllIconOnUnread: Story = {
  ...MarkAllIconOnAll,
  args: { params: { tab: "unread", page: 1 } },
};

let headerUnread = 2;
export const UpdatesHeaderCount: Story = {
  beforeEach: () => {
    headerUnread = 2;
    const previous = window.fetch;
    window.fetch = fn(async () => Response.json({ unread: headerUnread }));
    return () => { window.fetch = previous; };
  },
  args: {
    markReadAction: fn(async () => {
      headerUnread = 1;
      return { ok: true as const };
    }),
    markAllReadAction: fn(async () => {
      headerUnread = 0;
      return { counts: { ...data.counts, unread: 0, read: 3 } };
    }),
  },
  render: (args) => (
    <>
      <HeaderNotifications />
      <NotificationsView {...args} />
    </>
  ),
  play: async ({ canvas }) => {
    await canvas.findByRole("link", { name: "Notifications, 2 unread" });
    await userEvent.click(canvas.getByRole("button", { name: /Welcome to SeatSure/ }));
    await expect(await canvas.findByRole("link", { name: "Notifications, 1 unread" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Mark All as Read" }));
    await expect(await canvas.findByRole("link", { name: /^Notifications$/ })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /Notifications, .* unread/ })).toBeNull();
  },
};
