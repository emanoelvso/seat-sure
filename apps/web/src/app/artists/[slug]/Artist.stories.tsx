import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { expect, fn, screen, within } from "storybook/test";
import {
  FIND_ARTIST_BY_SLUG,
  FindArtistBySlug,
} from "@/graphql/queries/find-artist-by-slug";
import Artist from "./Artist";

const BIO =
  "British singer-songwriter known for her powerhouse vocals and record-breaking albums.";

const request = {
  query: FIND_ARTIST_BY_SLUG,
  variables: { input: { slug: "adele" } },
};

const daysFromNow = (days: number, hour = 20) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const baseEvent = (id: string, city: string, country: string, venue: string, startAt: string) => ({
  __typename: "Event",
  id,
  type: "concert",
  name: "Weekends with Adele",
  description: "Las Vegas residency",
  coverImage: "/artists.png",
  venue,
  city,
  country,
  date: startAt,
  startAt,
  status: "published",
  price: 449.99,
  category: "Pop",
});

const dateEvent = (
  id: string,
  city: string,
  country: string,
  venue: string,
  startAt: string,
) => ({ ...baseEvent(id, city, country, venue, startAt), tags: ["Popular"] });

const group = (city: string, country: string, events: object[]) => ({
  __typename: "EventsByCity",
  city,
  country,
  events,
});

const payload = (overrides: Partial<Record<keyof FindArtistBySlug, unknown>> = {}) => ({
  request,
  result: {
    data: {
      findArtistBySlug: {
        __typename: "FindArtist",
        artist: {
          __typename: "Artist",
          name: "Adele",
          cover: "/artists.png",
          bio: BIO,
        },
        eventsByCity: [
          group("Las Vegas", "USA", [
            dateEvent("lv1", "Las Vegas", "USA", "The Colosseum at Caesars Palace", daysFromNow(10)),
          ]),
        ],
        nearbyEvents: [],
        featuredFestival: null,
        ...overrides,
      },
    },
  },
});

const meta: Meta<typeof Artist> = {
  title: "Pages/Artist",
  component: Artist,
  args: { slug: "adele" },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { parameters }) => (
      <MockedProvider mocks={parameters.mocks as MockLink.MockedResponse[]}>
        <Story />
      </MockedProvider>
    ),
  ],
} satisfies Meta<typeof Artist>;

export default meta;

type Story = StoryObj<typeof Artist>;

export const Loading: Story = {
  parameters: { mocks: [{ request, delay: Infinity }] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Loading artist…",
    );
  },
};

export const ErrorThenRetry: Story = {
  parameters: {
    mocks: [{ request, error: new Error("Network down") }, payload()],
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't load this artist.",
    );

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Adele" }),
    ).toBeVisible();
  },
};

export const NotFound: Story = {
  parameters: {
    mocks: [
      payload({
        artist: null,
        eventsByCity: [],
        nearbyEvents: [],
        featuredFestival: null,
      }),
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Artist not found" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse events" }),
    ).toHaveAttribute("href", "/events");
  },
};

export const NoUpcomingDates: Story = {
  parameters: { mocks: [payload({ eventsByCity: [] })] },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText("No upcoming dates")).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "City" })).toBeNull();
    await expect(canvas.queryByRole("link", { name: "Get Tickets" })).toBeNull();
    await expect(
      canvasElement.querySelector('a[href^="https://www.google.com/maps"]'),
    ).toBeNull();
  },
};

export const Loaded: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole("heading", { level: 1 });

    await expect(heading).toHaveTextContent("Adele");
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expect(canvas.getByText(BIO)).toBeVisible();
  },
};

const COLOSSEUM = "The Colosseum at Caesars Palace";

const tour = [
  group("Las Vegas", "USA", [
    dateEvent("lv1", "Las Vegas", "USA", COLOSSEUM, daysFromNow(10)),
    dateEvent("lv2", "Las Vegas", "USA", COLOSSEUM, daysFromNow(17)),
  ]),
  group("New York", "USA", [
    dateEvent("ny1", "New York", "USA", "Madison Square Garden", daysFromNow(40)),
  ]),
  group("London", "United Kingdom", [
    dateEvent("lon1", "London", "United Kingdom", "The O2 Arena", daysFromNow(60)),
    dateEvent("lon2", "London", "United Kingdom", "The O2 Arena", daysFromNow(250)),
  ]),
];

const festival = {
  ...baseEvent("f1", "Las Vegas", "USA", "Las Vegas Festival Grounds", daysFromNow(30)),
  type: "festival",
  name: "Music Festival",
  description: "Mehdi Lorestani with DJ Hamed",
};

const cardLabels = (region: HTMLElement) =>
  within(region)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

const region = (name: string) =>
  screen.getByRole("region", { name });

export const DefaultCity: Story = {
  parameters: { mocks: [payload({ eventsByCity: tour })] },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("combobox", { name: "City" }),
    ).toHaveTextContent("Las Vegas, USA");
    await expect(cardLabels(region("All days and times"))).toEqual([
      `${COLOSSEUM} - Las Vegas, USA`,
      `${COLOSSEUM} - Las Vegas, USA`,
    ]);

    const map = canvas.getByRole("link", {
      name: `${COLOSSEUM}, Las Vegas, USA`,
    });
    await expect(map).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=The%20Colosseum%20at%20Caesars%20Palace%2C%20Las%20Vegas%2C%20USA",
    );
    await expect(canvas.getByRole("img", { name: "Adele" })).toBeVisible();
  },
};

export const SwitchCity: Story = {
  parameters: { mocks: [payload({ eventsByCity: tour })] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("combobox", { name: "City" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "London, United Kingdom" }),
    );

    await expect(cardLabels(region("All days and times"))).toEqual([
      "The O2 Arena - London, United Kingdom",
      "The O2 Arena - London, United Kingdom",
    ]);
    await expect(
      canvas.getByRole("link", { name: "The O2 Arena, London, United Kingdom" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("link", { name: `${COLOSSEUM}, Las Vegas, USA` }),
    ).toBeNull();
    await expect(cardLabels(region("Until 6 months"))).toEqual([
      `${COLOSSEUM} - Las Vegas, USA`,
      `${COLOSSEUM} - Las Vegas, USA`,
      "Madison Square Garden - New York, USA",
    ]);
  },
};

export const UntilSixMonths: Story = {
  parameters: { mocks: [payload({ eventsByCity: tour })] },
  play: async ({ canvas }) => {
    await canvas.findByRole("combobox", { name: "City" });

    const elsewhere = region("Until 6 months");
    await expect(cardLabels(elsewhere)).toEqual([
      "Madison Square Garden - New York, USA",
      "The O2 Arena - London, United Kingdom",
    ]);
    await expect(
      within(elsewhere)
        .getAllByRole("link", { name: "Get Tickets" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/events/ny1/tickets", "/events/lon1/tickets"]);
  },
};

export const SingleCity: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas }) => {
    await canvas.findByRole("combobox", { name: "City" });

    await expect(
      canvas.queryByRole("heading", { name: "Until 6 months" }),
    ).toBeNull();
  },
};

export const WithFestivalAndRecommendations: Story = {
  parameters: {
    mocks: [
      payload({
        eventsByCity: tour,
        nearbyEvents: [
          baseEvent("n1", "Miami", "USA", "Kaseya Center", daysFromNow(20)),
          baseEvent("n2", "Chicago", "USA", "United Center", daysFromNow(25)),
        ],
        featuredFestival: festival,
      }),
    ],
  },
  play: async ({ canvas }) => {
    const banner = await canvas.findByRole("heading", {
      level: 2,
      name: "Music Festival",
    });
    const bannerLink = banner.closest("a");
    await expect(bannerLink).toHaveAttribute("href", "/events/f1/tickets");

    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    await expect(
      region("All days and times").compareDocumentPosition(bannerLink!) &
        following,
    ).toBe(following);
    await expect(
      bannerLink!.compareDocumentPosition(region("Until 6 months")) & following,
    ).toBe(following);

    await expect(
      canvas.getByRole("heading", { name: "Concert near you" }),
    ).toBeVisible();
  },
};

export const WithoutFestivalOrRecommendations: Story = {
  parameters: {
    mocks: [
      payload({ eventsByCity: tour, nearbyEvents: [], featuredFestival: null }),
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole("combobox", { name: "City" });

    await expect(
      canvas.queryByRole("heading", { name: "Concert near you" }),
    ).toBeNull();
    await expect(
      canvasElement.querySelector('a[href="/events/f1/tickets"]'),
    ).toBeNull();
  },
};

let share: ReturnType<typeof fn>;

export const ShareFromCard: Story = {
  parameters: { mocks: [payload({ eventsByCity: tour })] },
  beforeEach: () => {
    share = fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    return () => {
      delete (navigator as { share?: unknown }).share;
    };
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("combobox", { name: "City" });

    const [datesCard] = within(region("All days and times")).getAllByRole(
      "article",
    );
    const [elsewhereCard] = within(region("Until 6 months")).getAllByRole(
      "article",
    );
    await userEvent.click(within(datesCard).getByRole("button", { name: "Share" }));
    await userEvent.click(
      within(elsewhereCard).getByRole("button", { name: "Share" }),
    );

    await expect(share).toHaveBeenNthCalledWith(1, {
      title: `Adele - ${COLOSSEUM}`,
      url: window.location.href,
    });
    await expect(share).toHaveBeenNthCalledWith(2, {
      title: "Adele - Madison Square Garden",
      url: window.location.href,
    });
  },
};
