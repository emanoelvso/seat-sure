import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { expect } from "storybook/test";
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
  name: "Adele",
  description: "Weekends with Adele",
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
