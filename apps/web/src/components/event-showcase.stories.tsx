import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { MainCardProps } from "./main-card";
import { EventShowcase } from "./event-showcase";

const card = (
  name: string,
  category: string,
  href: string,
): MainCardProps => ({
  avatarUrl: "/artists.png",
  name,
  date: "Oct 6, 2026",
  location: "Las Vegas",
  price: 199,
  category,
  href,
});

// The Rock filter leaves Metallica first, so a card that took the href at its
// index in the unfiltered list would point at Adele's event.
const events = [
  card("Adele", "Pop", "/events/evt-7f3a/tickets"),
  card("Metallica", "Rock", "/events/evt-c21d/tickets"),
];

const meta: Meta<typeof EventShowcase> = {
  title: "Components/EventShowcase",
  component: EventShowcase,
  args: {
    title: "Concert",
    type: "CONCERT",
    subCategories: ["Pop", "Rock"],
    events,
  },
} satisfies Meta<typeof EventShowcase>;

export default meta;

type Story = StoryObj<typeof EventShowcase>;

export const SeeAllConcerts: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/events?type=CONCERT",
    );
  },
};

export const SeeAllSports: Story = {
  args: { title: "Sport", type: "SPORT" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/events?type=SPORT",
    );
  },
};

export const PillsWithoutCloseIcon: Story = {
  play: async ({ canvas }) => {
    const pills = canvas.getAllByRole("button");

    await expect(
      pills.map((pill) => [
        pill.textContent,
        within(pill).queryAllByTestId("close-icon").length,
      ]),
    ).toEqual([
      ["All", 0],
      ["Pop", 0],
      ["Rock", 0],
    ]);
  },
};

export const CardsLinkToTheirEvents: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("link", { name: /Adele/ })).toHaveAttribute(
      "href",
      "/events/evt-7f3a/tickets",
    );
    await expect(
      canvas.getByRole("link", { name: /Metallica/ }),
    ).toHaveAttribute("href", "/events/evt-c21d/tickets");

    await userEvent.click(canvas.getByRole("button", { name: "Rock" }));

    await expect(canvas.queryByRole("link", { name: /Adele/ })).toBeNull();
    await expect(
      canvas.getByRole("link", { name: /Metallica/ }),
    ).toHaveAttribute("href", "/events/evt-c21d/tickets");
  },
};
