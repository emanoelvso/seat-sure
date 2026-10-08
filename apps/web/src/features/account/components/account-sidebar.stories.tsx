import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AccountSidebar } from "./account-sidebar";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
function atPath(pathname: string) {
  return {
    nextjs: { appDirectory: true, navigation: { pathname } },
    a11y: { test: "error" },
  };
}

const meta: Meta<typeof AccountSidebar> = {
  title: "Features/Account/AccountSidebar",
  component: AccountSidebar,
  tags: ["autodocs"],
  parameters: atPath("/account/tickets"),
  decorators: [
    (Story) => (
      <div className="flex h-[832px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountSidebar>;

export default meta;

type Story = StoryObj<typeof AccountSidebar>;

// NOTIF-13: Notification is implemented; Setting remains disabled.
const DISABLED_ITEMS = ["Setting"];

// ACCT-01 AC 1: the logo, the six items and the Upgrade card render.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "SeatSure" }),
    ).toHaveAttribute("href", "/");
    await expect(canvas.getByRole("link", { name: "Tickets" })).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Personal info" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Payment" })).toBeVisible();
    for (const name of DISABLED_ITEMS) {
      await expect(canvas.getByRole("link", { name })).toBeVisible();
    }
    await expect(canvas.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(canvas.getByText("Upgrade your plan")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "See plans" }),
    ).toBeVisible();
  },
};

// ACCT-01 AC 2: "Tickets" links to the list and is current on the list.
export const CurrentOnTicketsList: Story = {
  parameters: atPath("/account/tickets"),
  play: async ({ canvas }) => {
    const tickets = canvas.getByRole("link", { name: "Tickets" });
    await expect(tickets).toHaveAttribute("href", "/account/tickets");
    await expect(tickets).toHaveAttribute("aria-current", "page");
  },
};

// ACCT-01 AC 2: "Tickets" stays current on an order detail page.
export const CurrentOnTicketDetail: Story = {
  parameters: atPath("/account/tickets/x"),
  play: async ({ canvas }) => {
    const tickets = canvas.getByRole("link", { name: "Tickets" });
    await expect(tickets).toHaveAttribute("href", "/account/tickets");
    await expect(tickets).toHaveAttribute("aria-current", "page");
  },
};

// ACCT-01 AC 2 (WHILE): outside the tickets pages "Tickets" is not current.
export const NotCurrentElsewhere: Story = {
  parameters: atPath("/account/settings"),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Tickets" }),
    ).not.toHaveAttribute("aria-current");
  },
};

// PROFILE-09 AC 1 and 2: "Personal info" links to the page and is current
// there, and "Tickets" is not.
export const CurrentOnPersonalInfo: Story = {
  parameters: atPath("/account/personal-info"),
  play: async ({ canvas }) => {
    const personalInfo = canvas.getByRole("link", { name: "Personal info" });
    await expect(personalInfo).toHaveAttribute(
      "href",
      "/account/personal-info",
    );
    await expect(personalInfo).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("link", { name: "Tickets" }),
    ).not.toHaveAttribute("aria-current");
  },
};

// PROFILE-09 AC 2: on the tickets list the reverse holds, and the link still
// points at the page.
export const PersonalInfoNotCurrentOnTickets: Story = {
  parameters: atPath("/account/tickets"),
  play: async ({ canvas }) => {
    const personalInfo = canvas.getByRole("link", { name: "Personal info" });
    await expect(personalInfo).toHaveAttribute(
      "href",
      "/account/personal-info",
    );
    await expect(personalInfo).not.toHaveAttribute("aria-current");
    await expect(canvas.getByRole("link", { name: "Tickets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

// ACCT-01 AC 3 / PROFILE-09 AC 3: the unbuilt items and "See plans" are disabled, with no href.
export const DisabledItems: Story = {
  play: async ({ canvas }) => {
    for (const name of DISABLED_ITEMS) {
      const item = canvas.getByRole("link", { name });
      await expect(item).toHaveAttribute("aria-disabled", "true");
      await expect(item).not.toHaveAttribute("href");
    }
    const seePlans = canvas.getByRole("button", { name: "See plans" });
    await expect(seePlans).toHaveAttribute("aria-disabled", "true");
    await expect(seePlans).not.toHaveAttribute("href");
  },
};

// CARD-12 AC 1 and 2: "Payment" links to the page and is the only current
// item there.
export const CurrentOnPayment: Story = {
  parameters: atPath("/account/payment"),
  play: async ({ canvas }) => {
    const payment = canvas.getByRole("link", { name: "Payment" });
    await expect(payment).toHaveAttribute("href", "/account/payment");
    await expect(payment).toHaveAttribute("aria-current", "page");
    await expect(payment).not.toHaveAttribute("aria-disabled");
    const current = canvas
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    await expect(current).toEqual([payment]);
  },
};

// CARD-12 AC 2 (WHILE): elsewhere "Payment" is not current but still links
// to the page.
export const PaymentNotCurrentOnTickets: Story = {
  parameters: atPath("/account/tickets"),
  play: async ({ canvas }) => {
    const payment = canvas.getByRole("link", { name: "Payment" });
    await expect(payment).toHaveAttribute("href", "/account/payment");
    await expect(payment).not.toHaveAttribute("aria-current");
  },
};

// ACCT-02 AC 4: "Log out" submits POST /api/auth/logout.
export const LogOut: Story = {
  play: async ({ canvas }) => {
    const logOut = canvas.getByRole("button", { name: "Log out" });
    await expect(logOut).toHaveAttribute("type", "submit");
    const form = logOut.closest("form");
    await expect(form).toHaveAttribute("action", "/api/auth/logout");
    await expect(form).toHaveAttribute("method", "post");
  },
};

// NOTIF-13 AC1/2: Notification links to its page and is the current item.
export const NotificationCurrent: Story = {
  parameters: atPath("/account/notifications"),
  play: async ({ canvas }) => {
    const notification = canvas.getByRole("link", { name: "Notification" });
    await expect(notification).toHaveAttribute(
      "href",
      "/account/notifications",
    );
    await expect(notification).toHaveAttribute("aria-current", "page");
    await expect(notification).not.toHaveAttribute("aria-disabled");
    await expect(notification).toHaveClass("text-tint-400");
    const current = canvas
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    await expect(current).toEqual([notification]);
    await expect(canvas.getByRole("link", { name: "Setting" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(
      canvas.getByRole("link", { name: "Setting" }),
    ).not.toHaveAttribute("href");
  },
};

export const NotificationNotCurrent: Story = {
  parameters: atPath("/account/tickets"),
  play: async ({ canvas }) => {
    const notification = canvas.getByRole("link", { name: "Notification" });
    await expect(notification).toHaveAttribute(
      "href",
      "/account/notifications",
    );
    await expect(notification).not.toHaveAttribute("aria-current");
  },
};
