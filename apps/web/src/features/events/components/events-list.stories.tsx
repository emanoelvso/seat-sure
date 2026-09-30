import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
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
  price: 199,
  category: "Pop",
});

const events = [
  event("e1", "Adele", "Las Vegas", "The Colosseum at Caesars Palace", 6),
  event("e2", "Coldplay", "Chicago", "Soldier Field", 9),
  event("e3", "Dua Lipa", "Seattle", "Climate Pledge Arena", 18),
];

const NEXT_PAGE = "/events?type=SHOW&page=2";

type Canvas = ReturnType<typeof within>;

// Each card is one link to its event's tickets page.
const CARD_HREFS = [
  "/events/e1/tickets",
  "/events/e2/tickets",
  "/events/e3/tickets",
];

const linkHrefs = (canvas: Canvas) =>
  canvas
    .queryAllByRole("link")
    .map((link: HTMLElement) => link.getAttribute("href"));

const meta: Meta<typeof EventsList> = {
  title: "Features/Events/EventsList",
  component: EventsList,
  args: { events, hasMore: true, nextPageHref: NEXT_PAGE },
} satisfies Meta<typeof EventsList>;

export default meta;

type Story = StoryObj<typeof EventsList>;

export const WithMore: Story = {
  play: async ({ canvas }) => {
    await expect(linkHrefs(canvas)).toEqual([...CARD_HREFS, NEXT_PAGE]);
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
    await expect(linkHrefs(canvas)).toEqual(CARD_HREFS);
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
    await expect(linkHrefs(canvas)).toEqual([]);
    await expect(
      canvas.queryByRole("link", { name: "View more Events" }),
    ).toBeNull();
  },
};

export const CardsLinkToTheirEvents: Story = {
  play: async ({ canvas }) => {
    const cards: [RegExp, string][] = [
      [/Adele/, "/events/e1/tickets"],
      [/Coldplay/, "/events/e2/tickets"],
      [/Dua Lipa/, "/events/e3/tickets"],
    ];

    for (const [name, href] of cards) {
      await expect(canvas.getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }
  },
};
