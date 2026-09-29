import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { EventSummary } from "@/types/api";
import { zonedIso } from "@/testing/dates";
import { TopSingers } from "./top-singers";

const concert = (
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

// An odd count, so a split at floor(n / 2) would differ from ceil(n / 2).
const concerts = [
  concert("c1", "Adele", "Las Vegas", "The Colosseum at Caesars Palace", 6),
  concert("c2", "Coldplay", "Chicago", "Soldier Field", 9),
  concert("c3", "Taylor Swift", "New York", "Madison Square Garden", 12),
  concert("c4", "Bruno Mars", "Miami", "Kaseya Center", 15),
  concert("c5", "Dua Lipa", "Seattle", "Climate Pledge Arena", 18),
];

// Singer names in one carousel row. The carousel repeats each row to loop it.
const rowNames = (section: HTMLElement, direction: "left" | "right") => [
  ...new Set(
    within(
      section.querySelector<HTMLElement>(`.animate-scroll-${direction}`)!,
    )
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt")!.replace(/ avatar$/, "")),
  ),
];

const meta: Meta<typeof TopSingers> = {
  title: "Components/TopSingers",
  component: TopSingers,
  args: { concerts },
} satisfies Meta<typeof TopSingers>;

export default meta;

type Story = StoryObj<typeof TopSingers>;

export const TwoRows: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Top Singers" }),
    ).toBeVisible();

    const section = canvas.getByRole("region", { name: "Top Singers" });
    await expect(rowNames(section, "left")).toEqual([
      "Adele",
      "Coldplay",
      "Taylor Swift",
    ]);
    await expect(rowNames(section, "right")).toEqual([
      "Bruno Mars",
      "Dua Lipa",
    ]);
  },
};

export const LocationFromCity: Story = {
  play: async ({ canvas }) => {
    const section = within(
      canvas.getByRole("region", { name: "Top Singers" }),
    );

    await expect(section.getAllByText(/, Las Vegas$/)[0]).toBeVisible();
    await expect(section.queryAllByText(/Caesars Palace/)).toEqual([]);
  },
};
