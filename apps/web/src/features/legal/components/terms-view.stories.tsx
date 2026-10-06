import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TermsView } from "./terms-view";

const meta: Meta<typeof TermsView> = {
  title: "Features/Legal/TermsView",
  component: TermsView,
} satisfies Meta<typeof TermsView>;

export default meta;

type Story = StoryObj<typeof TermsView>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Terms & Privacy Policy" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/^Welcome to SeatSure! We are committed/),
    ).toBeVisible();

    const sections = canvas.getAllByRole("heading", { level: 2 });
    await expect(sections.map((heading) => heading.textContent)).toEqual([
      "1. Terms of Use",
      "2. Ticket Refund Policy",
      "3. Privacy Policy",
      "4. Changes to This Policy",
    ]);

    const lists = canvas.getAllByRole("list");
    await expect(lists).toHaveLength(3);
    await expect(
      lists.map((list) => within(list).getAllByRole("listitem").length),
    ).toEqual([4, 4, 5]);

    await expect(
      canvas.getByRole("link", { name: "support@seatsure.com" }),
    ).toHaveAttribute("href", "mailto:support@seatsure.com");

    await expect(canvas.queryByText(/Evenjo/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /accept/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /decline/i }),
    ).not.toBeInTheDocument();
  },
} satisfies Story;
