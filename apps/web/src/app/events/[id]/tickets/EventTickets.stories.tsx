import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { expect, screen, within } from "storybook/test";
import { concentricSeatMap } from "@/components/SeatMap.fixture";
import {
  FIND_EVENT_TICKETS,
  FindEventTickets,
} from "@/graphql/queries/find-event-tickets";
import EventTickets from "./EventTickets";

const EVENT_ID = "3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d";

const request = {
  query: FIND_EVENT_TICKETS,
  variables: { input: { eventId: EVENT_ID } },
};

const daysFromNow = (days: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const event = {
  __typename: "Event",
  id: EVENT_ID,
  name: "Adele",
  coverImage: "/artist/map.png",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  startAt: daysFromNow(10, 20),
  endsAt: daysFromNow(10, 22, 30),
};

const seatMap = {
  __typename: "SeatMap",
  ...concentricSeatMap,
  stage: { __typename: "SeatMapShape", ...concentricSeatMap.stage },
  sections: concentricSeatMap.sections.map((section) => ({
    __typename: "SeatMapSection",
    ...section,
  })),
};

const ticketType = (
  sectionKey: string,
  name: string,
  priceCents: number,
  overrides: {
    seatsAvailable?: number;
    maxPerOrder?: number;
    tags?: string[];
  } = {},
) => ({
  __typename: "TicketType",
  id: `tt-${sectionKey}`,
  sectionKey,
  name,
  priceCents,
  currency: "USD",
  seatsAvailable: 100,
  maxPerOrder: 4,
  tags: [],
  ...overrides,
});

const VIP = ticketType("vip", "VIP", 45000, {
  maxPerOrder: 6,
  tags: ["discounted", "vip"],
});
const A = ticketType("a", "A", 40000, { tags: ["discounted", "best seller"] });
const B = ticketType("b", "B", 30000, { tags: ["discounted", "best seller"] });
const C = ticketType("c", "C", 20000, { seatsAvailable: 3 });

// Deliberately not in price order: the page sorts.
const ticketTypes = [B, VIP, C, A];

const payload = (
  overrides: Partial<Record<keyof FindEventTickets, unknown>> = {},
) => ({
  request,
  result: {
    data: {
      findEventTickets: {
        __typename: "EventTickets",
        event,
        seatMap,
        ticketTypes,
        ...overrides,
      },
    },
  },
});

type Canvas = ReturnType<typeof within>;

const listings = (canvas: Canvas) =>
  within(canvas.getByRole("list", { name: "Listings" }));

const seatMapGroup = (canvas: Canvas) =>
  within(canvas.getByRole("group", { name: "Seat map" }));

const cardTitles = (canvas: Canvas) =>
  listings(canvas)
    .getAllByText(/^Section /)
    .map((title) => title.textContent);

const heroValue = (canvas: Canvas, testId: string) =>
  canvas.getByTestId(testId).textContent;

const meta: Meta<typeof EventTickets> = {
  title: "Pages/EventTickets",
  component: EventTickets,
  args: { eventId: EVENT_ID },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { parameters }) => (
      <MockedProvider mocks={parameters.mocks as MockLink.MockedResponse[]}>
        <Story />
      </MockedProvider>
    ),
  ],
} satisfies Meta<typeof EventTickets>;

export default meta;

type Story = StoryObj<typeof EventTickets>;

export const Loading: Story = {
  parameters: { mocks: [{ request, delay: Infinity }] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Loading tickets…",
    );
  },
};

export const ErrorThenRetry: Story = {
  parameters: {
    mocks: [{ request, error: new Error("Network down") }, payload()],
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't load tickets for this event.",
    );

    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Adele" }),
    ).toBeVisible();
  },
};

export const NotFound: Story = {
  parameters: {
    mocks: [payload({ event: null, seatMap: null, ticketTypes: [] })],
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Event not found" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Browse events" }),
    ).toHaveAttribute("href", "/events");
  },
};

export const NoSeatMap: Story = {
  parameters: { mocks: [payload({ seatMap: null })] },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Adele" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Seat selection isn't available for this event."),
    ).toBeVisible();

    await expect(canvas.queryByRole("group", { name: "Seat map" })).toBeNull();
    await expect(canvas.queryByRole("list", { name: "Listings" })).toBeNull();
    await expect(
      canvas.queryByRole("combobox", { name: "Tickets" }),
    ).toBeNull();
  },
};

export const Default: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });

    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-row")).toBe("—");
    await expect(heroValue(canvas, "hero-seat")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");

    await expect(
      seatMapGroup(canvas)
        .getAllByRole("button")
        .map((section) => section.getAttribute("aria-label")),
    ).toEqual(["Section VIP", "Section A", "Section B", "Section C"]);

    await expect(canvas.getByText("4 Listings")).toBeVisible();
    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
      "Section C",
    ]);
  },
};

export const SelectFromCard: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });

    const card = listings(canvas).getByRole("button", { name: "Section B" });
    await userEvent.click(card);

    await expect(
      listings(canvas).getAllByRole("button", { pressed: true }),
    ).toEqual([card]);
    await expect(
      seatMapGroup(canvas).getAllByRole("button", { pressed: true }),
    ).toEqual([
      seatMapGroup(canvas).getByRole("button", { name: "Section B" }),
    ]);
    await expect(heroValue(canvas, "hero-sec")).toBe("B");
    await expect(heroValue(canvas, "hero-price")).toBe("$300");
  },
};

export const SelectFromMap: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });
    const map = seatMapGroup(canvas);

    map.getByRole("button", { name: "Section A" }).focus();
    await userEvent.keyboard("{Enter}");

    await expect(
      listings(canvas).getAllByRole("button", { pressed: true }),
    ).toEqual([listings(canvas).getByRole("button", { name: "Section A" })]);
    await expect(map.getAllByRole("button", { pressed: true })).toEqual([
      map.getByRole("button", { name: "Section A" }),
    ]);
    await expect(heroValue(canvas, "hero-sec")).toBe("A");
    await expect(heroValue(canvas, "hero-price")).toBe("$400");

    await userEvent.click(map.getByRole("button", { name: "Section C" }));

    await expect(
      listings(canvas).getAllByRole("button", { pressed: true }),
    ).toEqual([listings(canvas).getByRole("button", { name: "Section C" })]);
    await expect(map.getAllByRole("button", { pressed: true })).toEqual([
      map.getByRole("button", { name: "Section C" }),
    ]);
    await expect(heroValue(canvas, "hero-sec")).toBe("C");
    await expect(heroValue(canvas, "hero-price")).toBe("$200");
  },
};

const LAWN = ticketType("lawn", "Lawn", 15000);

export const DisabledSection: Story = {
  parameters: { mocks: [payload({ ticketTypes: [VIP, A, B, LAWN] })] },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });
    const map = seatMapGroup(canvas);

    const sectionC = map.getByRole("button", { name: "Section C" });
    await expect(sectionC).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(sectionC);

    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);

    const lawn = listings(canvas).getByRole("button", { name: "Section Lawn" });
    await userEvent.click(lawn);

    await expect(
      listings(canvas).getAllByRole("button", { pressed: true }),
    ).toEqual([lawn]);
    await expect(map.queryAllByRole("button", { pressed: true })).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("Lawn");
    await expect(heroValue(canvas, "hero-price")).toBe("$150");
  },
};

export const SingleListing: Story = {
  parameters: { mocks: [payload({ ticketTypes: [B] })] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("1 Listing")).toBeVisible();
    await expect(cardTitles(canvas)).toEqual(["Section B"]);
  },
};

type PlayContext = Parameters<NonNullable<Story["play"]>>[0];

const pickQuantity = async (
  { canvas, userEvent }: PlayContext,
  label: string,
) => {
  await userEvent.click(canvas.getByRole("combobox", { name: "Tickets" }));
  await userEvent.click(await screen.findByRole("option", { name: label }));
};

const applyPrice = async (
  { canvas, userEvent }: PlayContext,
  pill: string,
  min: string,
  max: string,
) => {
  await userEvent.click(canvas.getByRole("button", { name: pill }));
  const minInput = await screen.findByRole("spinbutton", { name: "Min" });
  const maxInput = screen.getByRole("spinbutton", { name: "Max" });
  await userEvent.clear(minInput);
  await userEvent.type(minInput, min);
  await userEvent.clear(maxInput);
  await userEvent.type(maxInput, max);
  await userEvent.click(screen.getByRole("button", { name: "Apply" }));
};

const loaded = (canvas: Canvas) =>
  canvas.findByRole("heading", { level: 1, name: "Adele" });

export const QuantityOptions: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    const trigger = canvas.getByRole("combobox", { name: "Tickets" });
    await expect(trigger).toHaveTextContent(/^2 tickets$/);

    await userEvent.click(trigger);
    const options = await screen.findAllByRole("option");
    await expect(options.map((option) => option.textContent)).toEqual([
      "1 ticket",
      "2 tickets",
      "3 tickets",
      "4 tickets",
      "5 tickets",
      "6 tickets",
    ]);
  },
};

export const QuantityFilter: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas } = context;
    await loaded(canvas);

    await pickQuantity(context, "4 tickets");

    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
    ]);
    await expect(canvas.getByText("3 Listings")).toBeVisible();
    await expect(
      seatMapGroup(canvas).getByRole("button", { name: "Section C" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(
      listings(canvas).getAllByText("4 tickets, seated together"),
    ).toHaveLength(3);

    await pickQuantity(context, "1 ticket");

    await expect(listings(canvas).getAllByText("1 ticket")).toHaveLength(4);
    await expect(listings(canvas).queryByText(/seated together/)).toBeNull();
  },
};

export const PriceFilter: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas } = context;
    await loaded(canvas);

    await expect(
      canvas.getByRole("button", { name: "$200 - $450" }),
    ).toBeVisible();

    await applyPrice(context, "$200 - $450", "250", "420");

    await expect(cardTitles(canvas)).toEqual(["Section A", "Section B"]);
    await expect(
      canvas.getByRole("button", { name: "$250 - $420" }),
    ).toBeVisible();
  },
};

export const PriceInvalid: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas } = context;
    await loaded(canvas);

    await applyPrice(context, "$200 - $450", "500", "420");

    await expect(await screen.findByRole("alert")).toHaveTextContent(
      "Min can't exceed max",
    );
    await expect(canvas.getByText("4 Listings")).toBeVisible();
    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
      "Section C",
    ]);
    await expect(
      canvas.getByRole("button", { name: "$200 - $450" }),
    ).toBeInTheDocument();
  },
};

export const Sort: Story = {
  parameters: { mocks: [payload()] },
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
      "Section C",
    ]);

    await userEvent.click(canvas.getByRole("combobox", { name: "Sort by" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Price: low to high" }),
    );

    await expect(cardTitles(canvas)).toEqual([
      "Section C",
      "Section B",
      "Section A",
      "Section VIP",
    ]);
  },
};

export const NoMatches: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas } = context;
    await loaded(canvas);

    await applyPrice(context, "$200 - $450", "1", "100");

    await expect(
      canvas.getByText("No listings match your filters"),
    ).toBeVisible();
    await expect(canvas.getByText("0 Listings")).toBeVisible();
    await expect(canvas.queryByRole("list", { name: "Listings" })).toBeNull();
  },
};

export const FilterClearsSelection: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section C" }),
    );
    await expect(heroValue(canvas, "hero-sec")).toBe("C");

    await pickQuantity(context, "4 tickets");

    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);

    await pickQuantity(context, "2 tickets");

    await expect(
      listings(canvas).getByRole("button", { name: "Section C" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
  },
};

export const PriceFilterClearsSelection: Story = {
  parameters: { mocks: [payload()] },
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section VIP" }),
    );
    await expect(heroValue(canvas, "hero-sec")).toBe("VIP");

    await applyPrice(context, "$200 - $450", "200", "420");

    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);

    await applyPrice(context, "$200 - $420", "200", "450");

    await expect(
      listings(canvas).getByRole("button", { name: "Section VIP" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
  },
};

export const NoTicketTypes: Story = {
  parameters: { mocks: [payload({ ticketTypes: [] })] },
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await expect(canvas.getByText("0 Listings")).toBeVisible();
    await expect(
      canvas.getByText("No listings match your filters"),
    ).toBeVisible();
    await expect(
      seatMapGroup(canvas)
        .getAllByRole("button")
        .map((section) => section.getAttribute("aria-disabled")),
    ).toEqual(["true", "true", "true", "true"]);
    await expect(
      canvas.queryByRole("button", { name: /^\$\d+ - \$\d+$/ }),
    ).toBeNull();

    const trigger = canvas.getByRole("combobox", { name: "Tickets" });
    await expect(trigger).toHaveTextContent(/^1 ticket$/);
    await userEvent.click(trigger);
    const options = await screen.findAllByRole("option");
    await expect(options.map((option) => option.textContent)).toEqual([
      "1 ticket",
    ]);
  },
};
