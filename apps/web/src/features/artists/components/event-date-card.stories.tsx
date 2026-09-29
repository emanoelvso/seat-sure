import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { EventSummary } from "@/types/api";
import { zonedIso } from "@/testing/dates";
import { EventDateCard } from "./event-date-card";

const event: EventSummary = {
  id: "e1",
  name: "Adele",
  description: "Weekends with Adele",
  coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  date: zonedIso(2026, 10, 6),
  startAt: zonedIso(2026, 10, 6, 20, 0),
  price: 449.99,
  category: "Pop",
  tags: ["Popular", "Best Seller"],
};

const meta: Meta<typeof EventDateCard> = {
  title: "Components/EventDateCard",
  component: EventDateCard,
  args: { event, shareTitle: "Adele - The Colosseum at Caesars Palace" },
} satisfies Meta<typeof EventDateCard>;

export default meta;

type Story = StoryObj<typeof EventDateCard>;

export const WithTags: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        name: "The Colosseum at Caesars Palace - Las Vegas, USA",
      }),
    ).toBeVisible();
    await expect(canvas.getByText("Nov 06 - 2026")).toBeVisible();
    await expect(canvas.getByText("8:00 PM")).toBeVisible();

    const tags = within(canvas.getByRole("list", { name: "Tags" }));
    await expect(
      tags.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Popular", "Best Seller"]);

    await expect(
      canvas.getByRole("link", { name: "Get Tickets" }),
    ).toHaveAttribute("href", "/events/e1/tickets");
    await expect(canvas.getByRole("button", { name: "Share" })).toBeVisible();

    const bookmark = canvas.getByTestId("bookmark-icon");
    await expect(bookmark).toHaveAttribute("aria-hidden", "true");
    await expect(bookmark.closest("button, a")).toBeNull();
  },
};

export const WithoutTags: Story = {
  args: { event: { ...event, tags: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("list", { name: "Tags" })).toBeNull();
  },
};
