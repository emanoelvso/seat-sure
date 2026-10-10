import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { NotificationTabs } from "./notification-tabs";

const meta: Meta<typeof NotificationTabs> = {
  title: "Features/Account/NotificationTabs",
  component: NotificationTabs,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story.
  parameters: { a11y: { test: "error" } },
  args: {
    counts: { __typename: "NotificationCounts", all: 7, unread: 3, read: 4 },
    tab: "all",
  },
} satisfies Meta<typeof NotificationTabs>;

export default meta;

type Story = StoryObj<typeof NotificationTabs>;

const LABELS = ["All (7)", "Unread (3)", "Read (4)"];

async function expectCurrent(
  canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"],
  current: string,
) {
  for (const name of LABELS) {
    const link = canvas.getByRole("link", { name });
    if (name === current) {
      await expect(link).toHaveAttribute("aria-current", "page");
    } else {
      await expect(link).not.toHaveAttribute("aria-current");
    }
  }
}

// NOTIF-06 (View AC 3-4, 10): labels with the counts over all notifications,
// hrefs without a page param, and "All" current.
export const AllCurrent: Story = {
  play: async ({ canvas }) => {
    const tabs = canvas.getAllByRole("link");
    await expect(tabs.map((tab) => tab.textContent)).toEqual(LABELS);

    await expect(canvas.getByRole("link", { name: "All (7)" })).toHaveAttribute(
      "href",
      "/account/notifications",
    );
    await expect(
      canvas.getByRole("link", { name: "Unread (3)" }),
    ).toHaveAttribute("href", "/account/notifications?tab=unread");
    await expect(
      canvas.getByRole("link", { name: "Read (4)" }),
    ).toHaveAttribute("href", "/account/notifications?tab=read");
    await expectCurrent(canvas, "All (7)");
  },
};

// NOTIF-06: with tab=unread, "Unread (3)" is current.
export const UnreadCurrent: Story = {
  args: { tab: "unread" },
  play: async ({ canvas }) => {
    await expectCurrent(canvas, "Unread (3)");
  },
};

// NOTIF-06: with tab=read, "Read (4)" is current.
export const ReadCurrent: Story = {
  args: { tab: "read" },
  play: async ({ canvas }) => {
    await expectCurrent(canvas, "Read (4)");
  },
};
