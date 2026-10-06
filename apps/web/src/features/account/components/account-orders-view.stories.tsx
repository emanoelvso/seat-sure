import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { accountOrdersPage } from "@/testing/account-orders.fixture";
import { AccountOrdersView } from "./account-orders-view";

const meta: Meta<typeof AccountOrdersView> = {
  title: "Features/Account/AccountOrdersView",
  component: AccountOrdersView,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: {
    data: accountOrdersPage(),
    params: { status: "all", sort: "oldest", page: 1 },
  },
} satisfies Meta<typeof AccountOrdersView>;

export default meta;

type Story = StoryObj<typeof AccountOrdersView>;

// ORDLIST-02 AC 3, ORDLIST-05 AC 10-11: one page of 4 cards under the tabs
// and "Sort by", then pagination whose page links keep status and sort.
export const PageOfFour: Story = {
  args: {
    data: accountOrdersPage({
      counts: {
        __typename: "AccountOrderCounts",
        all: 7,
        pending: 4,
        cancelled: 2,
        completed: 1,
      },
    }),
    params: { status: "pending", sort: "oldest", page: 1 },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("article")).toHaveLength(4);
    await expect(
      canvas.getByRole("navigation", { name: "Order status" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("combobox", { name: "Sort by" }),
    ).toBeVisible();

    const pagination = canvas.getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toBeVisible();
    const pageTwo = canvas.getByRole("link", { name: "2" });
    const href = new URL(pageTwo.getAttribute("href")!, "http://localhost");
    await expect(href.pathname).toBe("/account/tickets");
    await expect(Object.fromEntries(href.searchParams)).toEqual({
      status: "pending",
      sort: "oldest",
      page: "2",
    });
    await expect(canvas.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const next = canvas.getByRole("link", { name: "Next page" });
    const nextHref = new URL(next.getAttribute("href")!, "http://localhost");
    await expect(nextHref.pathname).toBe("/account/tickets");
    await expect(Object.fromEntries(nextHref.searchParams)).toEqual({
      status: "pending",
      sort: "oldest",
      page: "2",
    });
  },
};

// ORDLIST-06: the API's effective page (1 when the URL asked past the end)
// is the current one.
export const EffectivePage: Story = {
  args: {
    data: accountOrdersPage({ page: 1 }),
    params: { status: "all", sort: "newest", page: 9 },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

// ORDEMPTY-01 AC 1: with no orders at all, only the empty state shows.
export const NoOrders: Story = {
  args: {
    data: accountOrdersPage({
      items: [],
      counts: {
        __typename: "AccountOrderCounts",
        all: 0,
        pending: 0,
        cancelled: 0,
        completed: 0,
      },
      totalPages: 0,
    }),
    params: { status: "all", sort: "newest", page: 1 },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "ooops!!!" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse Events" }),
    ).toHaveAttribute("href", "/events");
    await expect(
      canvas.queryByRole("navigation", { name: "Order status" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("combobox", { name: "Sort by" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("navigation", { name: "Pagination" }),
    ).toBeNull();
    await expect(canvas.queryByText("No orders in this tab.")).toBeNull();
  },
};

// ORDEMPTY-01 AC 2: orders exist but none in this tab: the tabs and "Sort by"
// stay, and the text replaces the cards.
export const EmptyTab: Story = {
  args: {
    data: accountOrdersPage({
      items: [],
      counts: {
        __typename: "AccountOrderCounts",
        all: 3,
        pending: 3,
        cancelled: 0,
        completed: 0,
      },
      totalPages: 0,
    }),
    params: { status: "canceled", sort: "newest", page: 1 },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Canceled (0)" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("combobox", { name: "Sort by" }),
    ).toBeVisible();
    await expect(canvas.getByText("No orders in this tab.")).toBeVisible();
    await expect(canvas.queryByRole("article")).toBeNull();
    await expect(
      canvas.queryByRole("heading", { name: "ooops!!!" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("navigation", { name: "Pagination" }),
    ).toBeNull();
  },
};
