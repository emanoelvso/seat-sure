import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BellIcon,
  Logout2Icon,
  SettingsIcon,
  TicketIcon,
  UserIcon,
  WalletIcon,
} from "@solar-icons/react/outline";
import { AccountSidebar } from "./account-sidebar";

const actions = [
  { label: "Tickets", href: "/account/tickets", icon: TicketIcon },
  { label: "Personal info", href: "/account/personal-info", icon: UserIcon },
  { label: "Payment", href: "/account/payment", icon: WalletIcon },
  { label: "Notification", href: "/account/notifications", icon: BellIcon },
  { label: "Setting", href: "/account/settings", icon: SettingsIcon },
  { label: "Log out", href: undefined, icon: Logout2Icon },
] as const;

function atWidth(width: number) {
  return {
    viewport: {
      options: {
        sidebar: {
          name: `${width}px`,
          styles: { width: `${width}px`, height: "900px" },
        },
      },
    },
  };
}

const meta = {
  title: "Features/Account/AccountSidebarMinimized",
  component: AccountSidebar,
  parameters: {
    ...atWidth(1023),
    nextjs: { appDirectory: true, navigation: { pathname: "/account/tickets" } },
    a11y: { test: "error" },
  },
  globals: { viewport: { value: "sidebar", isRotated: false } },
  args: { className: "h-[832px]" },
  beforeEach: async ({ parameters }) => {
    // The installed Storybook addon uses Vitest 4's context entry. Use the
    // installed Vitest 5 entry directly; interactive Storybook owns its viewport.
    const browser = await import("vitest/browser").catch(() => null);
    if (browser) {
      const width = Number.parseInt(parameters.viewport.options.sidebar.styles.width, 10);
      await browser.page.viewport(width, 900);
    }
  },
} satisfies Meta<typeof AccountSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

async function checkMinimized(canvas: Canvas) {
  const sidebar = canvas.getByRole("complementary");
  await expect(sidebar.getBoundingClientRect().width).toBe(96);
  const style = getComputedStyle(sidebar);
  await expect(style.borderRadius).toBe("24px");
  await expect(style.backgroundColor).toBe("rgb(18, 18, 18)");
  await expect(style.paddingTop).toBe("16px");
  await expect(style.paddingBottom).toBe("16px");
  await expect(style.paddingLeft).toBe("0px");
  await expect(style.paddingRight).toBe("0px");

  const logo = canvas.getByRole("link", { name: "SeatSure" });
  await expect(logo).toHaveAttribute("href", "/");
  await expect(getComputedStyle(logo).fontSize).toBe("29px");
  await expect(getComputedStyle(logo).fontFamily).toContain("Lobster");
  await expect(
    logo.getBoundingClientRect().left + logo.getBoundingClientRect().width / 2,
  ).toBe(
    sidebar.getBoundingClientRect().left + sidebar.getBoundingClientRect().width / 2,
  );
  // The wordmark nearly fills the sidebar and Linux Chromium sets Lobster up to
  // half a pixel wider than macOS, so the bounds allow that much sub-pixel slack.
  await expect(logo.getBoundingClientRect().left).toBeGreaterThanOrEqual(
    sidebar.getBoundingClientRect().left - 0.5,
  );
  await expect(logo.getBoundingClientRect().right).toBeLessThanOrEqual(
    sidebar.getBoundingClientRect().right + 0.5,
  );
  const header = logo.parentElement!;
  await expect(header.getBoundingClientRect().height).toBe(60);
  const nav = canvas.getByRole("navigation", { name: "Account" });
  await expect(
    nav.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
  ).toBe(35);
  await expect(getComputedStyle(nav).rowGap).toBe("20px");
  const dividers = sidebar.querySelectorAll("hr");
  await expect(dividers).toHaveLength(2);
  for (const divider of dividers) {
    const rect = divider.getBoundingClientRect();
    await expect(rect.width).toBe(64);
    await expect(rect.left - sidebar.getBoundingClientRect().left).toBe(16);
    await expect(getComputedStyle(divider).borderTopColor).toBe("rgb(31, 31, 31)");
  }
  const secondary = dividers[1].parentElement!;
  await expect(getComputedStyle(secondary).paddingTop).toBe("3px");
  await expect(getComputedStyle(secondary).rowGap).toBe("18px");
  for (const group of nav.querySelectorAll("ul")) {
    await expect(getComputedStyle(group).rowGap).toBe("8px");
  }

  for (const { label, href, icon: ExpectedIcon } of actions) {
    const action = canvas.getByRole(href ? "link" : "button", { name: label });
    await expect(action).toBeVisible();
    await expect(action).toHaveAttribute("title", label);
    await expect(canvas.getByText(label, { exact: true })).not.toBeVisible();
    if (href) await expect(action).toHaveAttribute("href", href);
    const rect = action.getBoundingClientRect();
    await expect(rect.width).toBe(96);
    await expect(rect.height).toBe(40);
    const icon = action.querySelector("svg")!;
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    const iconRect = icon.getBoundingClientRect();
    await expect(iconRect.width).toBe(24);
    await expect(iconRect.height).toBe(24);
    await expect(iconRect.left - rect.left).toBe(36);
    await expect(iconRect.top - rect.top).toBe(8);
    // Compare all path data to the named Solar outline icon, not just SVG presence.
    const expected = new DOMParser().parseFromString(
      renderToStaticMarkup(<ExpectedIcon size={24} />),
      "text/html",
    );
    await expect(
      Array.from(icon.querySelectorAll("path"), (path) => path.getAttribute("d")),
    ).toEqual(
      Array.from(expected.querySelectorAll("path"), (path) => path.getAttribute("d")),
    );
  }
  await expect(canvas.queryByRole("button", { name: "See plans" })).toBeNull();
  await expect(canvas.getByText("Upgrade your plan")).not.toBeVisible();
  const logout = canvas.getByRole("button", { name: "Log out" });
  await expect(logout).toHaveAttribute("type", "submit");
  await expect(logout.closest("form")).toHaveAttribute("method", "post");
  await expect(logout.closest("form")).toHaveAttribute("action", "/api/auth/logout");
}

async function checkExpanded(canvas: Canvas) {
  const sidebar = canvas.getByRole("complementary");
  await expect(sidebar.getBoundingClientRect().width).toBe(240);
  await expect(getComputedStyle(sidebar).paddingLeft).toBe("16px");
  await expect(getComputedStyle(sidebar).paddingRight).toBe("16px");
  await expect(
    getComputedStyle(canvas.getByRole("link", { name: "SeatSure" })).fontSize,
  ).toBe("40px");
  for (const { label } of actions) {
    await expect(canvas.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(canvas.getByText("Upgrade your plan")).toBeVisible();
  await expect(canvas.getByRole("button", { name: "See plans" })).toBeVisible();
}

async function checkCurrent(canvas: Canvas, label: string) {
  const link = canvas.getByRole("link", { name: label });
  await expect(
    canvas.getAllByRole("link").filter((item) => item.hasAttribute("aria-current")),
  ).toEqual([link]);
  await expect(link).toHaveAttribute("aria-current", "page");
  const style = getComputedStyle(link);
  await expect(style.color).toBe("rgb(213, 128, 242)");
  await expect(style.boxShadow).toBe("rgb(213, 128, 242) 4px 0px 0px 0px inset");
  // The minimized current item has two 40%-opacity fills with 60%-alpha stops.
  await expect(style.backgroundImage.match(/linear-gradient/g)).toHaveLength(2);
  await expect(style.backgroundImage.match(/\/ 0\.24\)/g)).toHaveLength(2);
  await expect(style.backgroundImage).toContain("13.46%");
  await expect(style.backgroundImage).toContain("1.923%");
  await expect(style.backgroundImage).toContain("27.691%");
}

export const MinimizedAtBoundary: Story = {
  play: async ({ canvas }) => {
    await checkMinimized(canvas);
    await checkCurrent(canvas, "Tickets");
  },
};

export const NarrowViewport: Story = {
  parameters: atWidth(375),
  play: async ({ canvas }) => {
    await checkMinimized(canvas);
    await expect(document.documentElement.scrollWidth).toBe(window.innerWidth);
  },
};

export const ExpandedAtBoundary: Story = {
  parameters: atWidth(1024),
  play: async ({ canvas }) => checkExpanded(canvas),
};

// Vitest's viewport command resizes the same mounted component in both directions.
// Hide this runner-only story from the interactive Storybook development surface.
export const ResponsiveResize: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas }) => {
    const { page } = await import("vitest/browser");
    const sidebar = canvas.getByRole("complementary");
    for (const width of [1024, 1023, 1440, 375]) {
      await page.viewport(width, 900);
      await waitFor(() =>
        expect(sidebar.getBoundingClientRect().width).toBe(width < 1024 ? 96 : 240),
      );
      await expect(canvas.getByRole("complementary")).toBe(sidebar);
      if (width < 1024) await checkMinimized(canvas);
      else await checkExpanded(canvas);
    }
  },
};

export const PersonalInfoCurrent: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/personal-info" } } },
  play: async ({ canvas }) => checkCurrent(canvas, "Personal info"),
};

export const PaymentCurrent: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/payment" } } },
  play: async ({ canvas }) => checkCurrent(canvas, "Payment"),
};

export const NotificationCurrent: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/notifications" } } },
  play: async ({ canvas }) => checkCurrent(canvas, "Notification"),
};

export const SettingsCurrent: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/settings" } } },
  play: async ({ canvas }) => checkCurrent(canvas, "Setting"),
};

export const TicketDetailCurrent: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/tickets/order-123" } } },
  play: async ({ canvas }) => checkCurrent(canvas, "Tickets"),
};

export const NoCurrentOnUnrelatedPath: Story = {
  parameters: { nextjs: { navigation: { pathname: "/account/tickets-archive" } } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole("link").filter((item) => item.hasAttribute("aria-current")),
    ).toEqual([]);
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    const home = canvas.getByRole("link", { name: "SeatSure" });
    home.focus();
    await expect(home).toHaveFocus();
    for (const { label, href } of actions) {
      await userEvent.tab();
      const action = canvas.getByRole(href ? "link" : "button", { name: label });
      await expect(action).toHaveFocus();
      await expect(action).toHaveAttribute("title", label);
    }
  },
};
