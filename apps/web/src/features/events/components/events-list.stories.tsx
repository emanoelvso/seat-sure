import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { EventSummary } from "@/types/api";
import { zonedIso } from "@/testing/dates";
import { EventsList } from "./events-list";

const event = (
  id: string,
  name: string,
  city: string,
  venue: string,
  day: number,
): EventSummary => ({
  id,
  name,
  coverImage: "/artists.png",
  venue,
  city,
  country: "USA",
  date: zonedIso(2026, 10, day),
  startAt: zonedIso(2026, 10, day, 20),
  status: "published",
  price: 199,
  category: "Pop",
});

const events = [
  event("e1", "Adele", "Las Vegas", "The Colosseum at Caesars Palace", 6),
  event("e2", "Coldplay", "Chicago", "Soldier Field", 9),
  event("e3", "Dua Lipa", "Seattle", "Climate Pledge Arena", 18),
];

const NEXT_PAGE = "/events?type=SHOW&page=2";

const meta: Meta<typeof EventsList> = {
  title: "Features/Events/EventsList",
  component: EventsList,
  args: { events, hasMore: true, nextPageHref: NEXT_PAGE },
} satisfies Meta<typeof EventsList>;

export default meta;

type Story = StoryObj<typeof EventsList>;

export const WithMore: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img", { name: "Avatar" })).toHaveLength(3);
    for (const name of ["Adele", "Coldplay", "Dua Lipa"]) {
      await expect(canvas.getByText(name)).toBeVisible();
    }
    await expect(
      canvas.getByRole("link", { name: "View more Events" }),
    ).toHaveAttribute("href", NEXT_PAGE);
    await expect(canvas.queryByText("No Events")).toBeNull();
  },
};

export const LastPage: Story = {
  args: { hasMore: false },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img", { name: "Avatar" })).toHaveLength(3);
    await expect(
      canvas.queryByRole("link", { name: "View more Events" }),
    ).toBeNull();
    await expect(canvas.queryByText("No Events")).toBeNull();
  },
};

export const Empty: Story = {
  args: { events: [], hasMore: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Events")).toBeVisible();
    await expect(canvas.queryAllByRole("img", { name: "Avatar" })).toEqual([]);
    await expect(
      canvas.queryByRole("link", { name: "View more Events" }),
    ).toBeNull();
  },
};
