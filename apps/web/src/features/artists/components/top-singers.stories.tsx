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

const headliner = (slug: string, name: string) => ({
  __typename: "EventHeadliner" as const,
  slug,
  name,
});

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

const row = (section: HTMLElement, direction: "left" | "right") =>
  section.querySelector<HTMLElement>(`.animate-scroll-${direction}`)!;

// Singer names a role query finds in a row, without deduplication.
const accessibleNames = (section: HTMLElement, direction: "left" | "right") =>
  within(row(section, direction))
    .getAllByRole("img")
    .map((img) => img.getAttribute("alt")!.replace(/ avatar$/, ""));

// [hidden from assistive tech, inert] for each loop copy of a row.
const copyStates = (section: HTMLElement, direction: "left" | "right") =>
  [...row(section, direction).children].map((copy) => [
    copy.getAttribute("aria-hidden") === "true",
    copy.hasAttribute("inert"),
  ]);

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

// Dates 30 minutes from midnight in env.timeZone, so any other zone lands on a
// different day (and month). `startAt` falls on another day, so the section
// must read `date`. The day number is `getDay()` (weekday index), a known bug
// kept out of scope: Sunday Nov 1 reads "0", Saturday Oct 31 reads "6".
export const DateInConfiguredZone: Story = {
  args: {
    concerts: [
      {
        ...concert("z1", "Adele", "Boston", "TD Garden", 20),
        date: zonedIso(2026, 10, 1, 0, 30),
      },
      {
        ...concert("z2", "Coldplay", "Denver", "Ball Arena", 20),
        date: zonedIso(2026, 9, 31, 23, 30),
      },
    ],
  },
  play: async ({ canvas }) => {
    const section = within(
      canvas.getByRole("region", { name: "Top Singers" }),
    );

    await expect(section.getAllByText("0 November, Boston")[0]).toBeVisible();
    await expect(section.getAllByText("6 October, Denver")[0]).toBeVisible();
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

export const LoopCopiesHidden: Story = {
  play: async ({ canvas }) => {
    const section = canvas.getByRole("region", { name: "Top Singers" });

    await expect(accessibleNames(section, "left")).toEqual([
      "Adele",
      "Coldplay",
      "Taylor Swift",
    ]);
    await expect(accessibleNames(section, "right")).toEqual([
      "Bruno Mars",
      "Dua Lipa",
    ]);

    for (const direction of ["left", "right"] as const) {
      await expect(copyStates(section, direction)).toEqual([
        [false, false],
        [true, false],
        [true, false],
        [true, false],
      ]);
    }
  },
};

const withHeadliners = [
  {
    ...concert("k1", "Eras Tour", "New York", "Madison Square Garden", 12),
    headliner: headliner("t-swift-13", "Taylor Swift"),
  },
  {
    ...concert("k2", "Music of the Spheres", "Chicago", "Soldier Field", 9),
    headliner: headliner("cp-band", "Coldplay"),
  },
  {
    ...concert("k3", "Future Nostalgia", "Seattle", "Climate Pledge", 18),
    headliner: headliner("dl-official", "Dua Lipa"),
  },
  {
    ...concert("k4", "24K Magic", "Miami", "Kaseya Center", 15),
    headliner: headliner("bm-hooligans", "Bruno Mars"),
  },
];

// Links in each loop copy of a row, copy by copy.
const copyLinks = (section: HTMLElement, direction: "left" | "right") =>
  [...row(section, direction).children].map((copy) => [
    ...copy.querySelectorAll<HTMLAnchorElement>("a[href]"),
  ]);

// Loop copies fill most of the visible row, so their cards must take clicks:
// the link is what the pointer hits at its center. They stay out of the tab
// order, so the keyboard reaches each card once.
export const LoopCopiesClickable: Story = {
  args: { concerts: withHeadliners },
  play: async ({ canvas }) => {
    const section = canvas.getByRole("region", { name: "Top Singers" });

    for (const direction of ["left", "right"] as const) {
      const [first, ...copies] = copyLinks(section, direction);

      await expect(first).toHaveLength(2);
      for (const link of first) {
        await expect(link).not.toHaveAttribute("tabindex");
      }
      for (const link of copies.flat()) {
        await expect(link).toHaveAttribute("tabindex", "-1");
      }

      const onScreen = copies.flat().filter((link) => {
        const { left, right, top, bottom } = link.getBoundingClientRect();
        return (
          left >= 0 &&
          right <= window.innerWidth &&
          top >= 0 &&
          bottom <= window.innerHeight
        );
      });
      await expect(onScreen.length).toBeGreaterThan(0);

      for (const link of onScreen) {
        const { left, top, width, height } = link.getBoundingClientRect();
        const hit = document.elementFromPoint(
          left + width / 2,
          top + height / 2,
        );
        await expect(link.contains(hit)).toBe(true);
      }
    }
  },
};

// Concerts named after their tours, so a slug derived from the card name can't
// pass. The last one has no headliner.
export const CardsLinkToHeadliners: Story = {
  args: {
    concerts: [
      {
        ...concert("h1", "Eras Tour", "New York", "Madison Square Garden", 12),
        headliner: headliner("taylor-swift", "Taylor Swift"),
      },
      {
        ...concert("h2", "Music of the Spheres", "Chicago", "Soldier Field", 9),
        headliner: headliner("coldplay", "Coldplay"),
      },
      {
        ...concert("h3", "Future Nostalgia", "Seattle", "Climate Pledge Arena", 18),
        headliner: headliner("dua-lipa", "Dua Lipa"),
      },
      {
        ...concert("h4", "Weekends with Adele", "Las Vegas", "The Colosseum", 6),
        headliner: null,
      },
    ],
  },
  play: async ({ canvas }) => {
    const section = within(
      canvas.getByRole("region", { name: "Top Singers" }),
    );
    const cards: [RegExp, string][] = [
      [/Eras Tour/, "/artists/taylor-swift"],
      [/Music of the Spheres/, "/artists/coldplay"],
      [/Future Nostalgia/, "/artists/dua-lipa"],
    ];

    for (const [name, href] of cards) {
      await expect(section.getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }

    await expect(section.getAllByText("Weekends with Adele")[0]).toBeVisible();
    await expect(
      section.queryByRole("link", { name: /Weekends with Adele/ }),
    ).toBeNull();
  },
};
