import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Pagination } from "./pagination";

const getHref = (page: number) => `/account/tickets?page=${page}`;

const meta: Meta<typeof Pagination> = {
  title: "Components/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  // a11y "error" makes the addon's violations fail the story (preview.tsx
  // only reports them).
  parameters: { a11y: { test: "error" } },
  args: { page: 1, totalPages: 3, getHref },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof Pagination>;

// ORDLIST-05 AC 11-12: on page 1 of 3, previous is disabled, the numbered
// pages link to their page, "1" is current and next links to page 2.
export const FirstOfThree: Story = {
  play: async ({ canvas }) => {
    const previous = canvas.getByRole("link", { name: "Previous page" });
    await expect(previous).toHaveAttribute("aria-disabled", "true");
    await expect(previous).not.toHaveAttribute("href");

    await expect(
      canvas.getByRole("link", { name: "Next page" }),
    ).toHaveAttribute("href", "/account/tickets?page=2");

    const first = canvas.getByRole("link", { name: "1" });
    await expect(first).toHaveAttribute("aria-current", "page");
    await expect(first).toHaveAttribute("href", "/account/tickets?page=1");
    for (const name of ["2", "3"]) {
      const link = canvas.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", `/account/tickets?page=${name}`);
      await expect(link).not.toHaveAttribute("aria-current");
    }
  },
};

// ORDLIST-05 AC 12: on the last page, next is disabled.
export const LastOfThree: Story = {
  args: { page: 3 },
  play: async ({ canvas }) => {
    const next = canvas.getByRole("link", { name: "Next page" });
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(next).not.toHaveAttribute("href");

    await expect(
      canvas.getByRole("link", { name: "Previous page" }),
    ).toHaveAttribute("href", "/account/tickets?page=2");
    await expect(canvas.getByRole("link", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

// ORDLIST-05 AC 11: with a single page there is no pagination.
export const SinglePage: Story = {
  args: { page: 1, totalPages: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("navigation")).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};
