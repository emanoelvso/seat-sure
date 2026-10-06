import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { OrderStatusTabs } from "./order-status-tabs";

const meta: Meta<typeof OrderStatusTabs> = {
  title: "Features/Account/OrderStatusTabs",
  component: OrderStatusTabs,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: {
    counts: {
      __typename: "AccountOrderCounts",
      all: 7,
      pending: 4,
      cancelled: 2,
      completed: 3,
    },
    params: { status: "all", sort: "newest", page: 1 },
  },
} satisfies Meta<typeof OrderStatusTabs>;

export default meta;

type Story = StoryObj<typeof OrderStatusTabs>;

const LABELS = ["All (7)", "Pending (4)", "Canceled (2)", "Completed (3)"];

// ORDLIST-02 AC 3-4: the four tabs with their counts; "All" is current when
// no status is set.
export const Default: Story = {
  play: async ({ canvas }) => {
    const tabs = canvas.getAllByRole("link");
    await expect(tabs.map((tab) => tab.textContent)).toEqual(LABELS);

    await expect(canvas.getByRole("link", { name: "All (7)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const name of LABELS.slice(1)) {
      await expect(canvas.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  },
};

// ORDLIST-02 AC 5: with status=canceled, "Canceled (2)" is current.
export const CanceledCurrent: Story = {
  args: { params: { status: "canceled", sort: "newest", page: 1 } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Canceled (2)" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      canvas.getByRole("link", { name: "All (7)" }),
    ).not.toHaveAttribute("aria-current");
  },
};

// ORDLIST-02 AC 5: a tab sets status and drops the page (back to 1) while
// keeping the sort (sort=oldest&page=2 in the URL).
export const KeepsSortAndResetsPage: Story = {
  args: { params: { status: "completed", sort: "oldest", page: 2 } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Pending (4)" }),
    ).toHaveAttribute("href", "/account/tickets?status=pending&sort=oldest");
    await expect(
      canvas.getByRole("link", { name: "Canceled (2)" }),
    ).toHaveAttribute("href", "/account/tickets?status=canceled&sort=oldest");
    await expect(canvas.getByRole("link", { name: "All (7)" })).toHaveAttribute(
      "href",
      "/account/tickets?sort=oldest",
    );
  },
};
