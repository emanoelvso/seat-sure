import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TZDate } from "@date-fns/tz";
import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { env } from "@/config/env";
import { concentricSeatMap } from "@/testing/seat-map.fixture";
import { zonedIso } from "@/testing/dates";
import { FindEventTickets } from "@/features/tickets/api/find-event-tickets";
import { EventTicketsView } from "./event-tickets-view";

const EVENT_ID = "3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d";

// `days` after today at `hour:minute`, all in the configured time zone.
const daysFromNow = (days: number, hour: number, minute = 0) => {
  const today = new TZDate(Date.now(), env.timeZone);
  return zonedIso(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days,
    hour,
    minute,
  );
};

const event = {
  id: EVENT_ID,
  name: "Adele",
  type: "concert",
  coverImage: "/artist/map.png",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  startAt: daysFromNow(10, 20),
  endsAt: daysFromNow(10, 22, 30),
  headliner: null,
};

const seatMap = concentricSeatMap;

const ticketType = (
  sectionKey: string,
  name: string,
  priceCents: number,
  overrides: {
    seatsAvailable?: number;
    maxPerOrder?: number;
    tags?: string[];
    maxPriceCents?: number;
  } = {},
) => ({
  id: `tt-${sectionKey}`,
  sectionKey,
  name,
  priceCents,
  maxPriceCents: priceCents,
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
): { eventTickets: FindEventTickets } => ({
  eventTickets: {
    event,
    seatMap,
    ticketTypes,
    ...overrides,
  } as FindEventTickets,
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

// aria-pressed of every map section, in map order: VIP, A, B, C.
const mapPressed = (canvas: Canvas) =>
  seatMapGroup(canvas)
    .getAllByRole("button")
    .map((section) => section.getAttribute("aria-pressed"));

// The detail panel's heading ("Section {name}"), or null while it's closed.
const panelHeading = (canvas: Canvas, name: string) =>
  canvas.queryByRole("heading", { level: 2, name });

const meta: Meta<typeof EventTicketsView> = {
  title: "Pages/EventTickets",
  component: EventTicketsView,
  args: payload(),
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EventTicketsView>;

export default meta;

type Story = StoryObj<typeof EventTicketsView>;

export const NoSeatMap: Story = {
  args: payload({ seatMap: null }),
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
  args: payload(),
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

// Rewritten for STAD-15 and STAD-22: a card click opens the detail panel in
// place of the listings column and doesn't press its map section (replaces
// SECT-12, where the card and its map section were pressed).
export const SelectFromCard: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section B" }),
    );

    await expect(panelHeading(canvas, "Section B")).toBeVisible();
    await expect(canvas.queryByRole("list", { name: "Listings" })).toBeNull();
    await expect(
      canvas.queryByRole("combobox", { name: "Sort by" }),
    ).toBeNull();
    await expect(canvas.queryByText("4 Listings")).toBeNull();
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "false",
      "false",
    ]);
    await expect(heroValue(canvas, "hero-sec")).toBe("B");
    await expect(heroValue(canvas, "hero-price")).toBe("$300");
  },
};

// Rewritten for STAD-10, STAD-11, STAD-12 and STAD-16: a map press narrows the
// listings and leaves the hero alone (replaces SECT-13, where it selected the
// ticket type). Pointer and keyboard paths, as before.
export const SelectFromMap: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });
    const map = seatMapGroup(canvas);

    await userEvent.click(map.getByRole("button", { name: "Section B" }));

    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section B"]);
    await expect(canvas.getByText("1 Listing")).toBeVisible();
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");

    map.getByRole("button", { name: "Section C" }).focus();
    await userEvent.keyboard("{Enter}");

    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section C"]);
    await expect(canvas.getByText("1 Listing")).toBeVisible();
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
  },
};

const LAWN = ticketType("lawn", "Lawn", 15000);

// Rewritten for STAD-22 and STAD-26: choosing Lawn opens its panel, whose mini
// map highlights nothing because Lawn has no map section (replaces SECT-12,
// where the Lawn card was pressed).
export const DisabledSection: Story = {
  args: payload({ ticketTypes: [VIP, A, B, LAWN] }),
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

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section Lawn" }),
    );

    await expect(panelHeading(canvas, "Section Lawn")).toBeVisible();
    await expect(canvas.queryByRole("list", { name: "Listings" })).toBeNull();
    await expect(canvas.getByRole("img", { name: "Seat map" })).toBeVisible();
    await expect(map.queryAllByRole("button", { pressed: true })).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("Lawn");
    await expect(heroValue(canvas, "hero-price")).toBe("$150");
  },
};

export const SingleListing: Story = {
  args: payload({ ticketTypes: [B] }),
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
  // Radix Select aria-hides the page while open but leaves its links and
  // buttons tabbable, which axe reports as aria-hidden-focus.
  parameters: {
    a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } },
  },
  args: payload(),
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
  args: payload(),
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
  args: payload(),
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
  args: payload(),
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
  args: payload(),
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
  args: payload(),
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

// Extended for SECT-30 through the detail panel (STAD-22): the open panel
// closes when the quantity hides its ticket type. Original assertions kept.
export const FilterClearsSelection: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section C" }),
    );
    await expect(heroValue(canvas, "hero-sec")).toBe("C");
    await expect(panelHeading(canvas, "Section C")).toBeVisible();

    await pickQuantity(context, "4 tickets");

    await expect(panelHeading(canvas, "Section C")).toBeNull();
    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
    ]);
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

// Extended for SECT-30 through the detail panel (STAD-22): the open panel
// closes when the price range hides its ticket type. Original assertions kept.
export const PriceFilterClearsSelection: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section VIP" }),
    );
    await expect(heroValue(canvas, "hero-sec")).toBe("VIP");
    await expect(panelHeading(canvas, "Section VIP")).toBeVisible();

    await applyPrice(context, "$200 - $450", "200", "420");

    await expect(panelHeading(canvas, "Section VIP")).toBeNull();
    await expect(cardTitles(canvas)).toEqual([
      "Section A",
      "Section B",
      "Section C",
    ]);
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
  // Radix Select aria-hides the page while open but leaves its links and
  // buttons tabbable, which axe reports as aria-hidden-focus.
  parameters: {
    a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } },
  },
  args: payload({ ticketTypes: [] }),
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

const ALL_CARDS = ["Section VIP", "Section A", "Section B", "Section C"];
const NONE_PRESSED = ["false", "false", "false", "false"];

const mapSection = (canvas: Canvas, name: string) =>
  seatMapGroup(canvas).getByRole("button", { name });

export const UnpressSection: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);
    const sectionB = mapSection(canvas, "Section B");

    await userEvent.click(sectionB);
    await expect(cardTitles(canvas)).toEqual(["Section B"]);

    await userEvent.click(sectionB);

    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(cardTitles(canvas)).toEqual(ALL_CARDS);
    await expect(canvas.getByText("4 Listings")).toBeVisible();
  },
};

export const NarrowingKeepsSectionsEnabled: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(mapSection(canvas, "Section B"));

    await expect(
      seatMapGroup(canvas)
        .getAllByRole("button")
        .map((section) => section.getAttribute("aria-disabled")),
    ).toEqual(["false", "false", "false", "false"]);

    await userEvent.click(mapSection(canvas, "Section A"));

    await expect(mapPressed(canvas)).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section A"]);
  },
};

export const CardKeepsPressedSection: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(mapSection(canvas, "Section A"));
    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section A" }),
    );

    await expect(heroValue(canvas, "hero-sec")).toBe("A");
    await expect(heroValue(canvas, "hero-price")).toBe("$400");
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
  },
};

export const MapPressKeepsOrClearsSelection: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);
    const sectionA = mapSection(canvas, "Section A");
    const sectionB = mapSection(canvas, "Section B");

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section A" }),
    );
    await expect(heroValue(canvas, "hero-sec")).toBe("A");

    // Pressing, then releasing, the selected type's own section keeps it.
    await userEvent.click(sectionA);
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "true",
      "false",
      "false",
    ]);
    await expect(heroValue(canvas, "hero-sec")).toBe("A");
    await expect(heroValue(canvas, "hero-price")).toBe("$400");

    await userEvent.click(sectionA);
    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(heroValue(canvas, "hero-sec")).toBe("A");
    await expect(heroValue(canvas, "hero-price")).toBe("$400");

    // Pressing another section hides card A, so the selection clears.
    await userEvent.click(sectionB);
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
    await expect(cardTitles(canvas)).toEqual(["Section B"]);
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);

    // Releasing B doesn't bring the selection back.
    await userEvent.click(sectionB);
    await expect(cardTitles(canvas)).toEqual(ALL_CARDS);
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
  },
};

export const QuantityClearsPressedSection: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(mapSection(canvas, "Section C"));

    // C has 3 seats: it still qualifies at 3 tickets, so it stays pressed.
    await pickQuantity(context, "3 tickets");
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section C"]);

    await pickQuantity(context, "4 tickets");
    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(cardTitles(canvas)).toEqual([
      "Section VIP",
      "Section A",
      "Section B",
    ]);
    await expect(canvas.getByText("3 Listings")).toBeVisible();

    await pickQuantity(context, "2 tickets");
    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(cardTitles(canvas)).toEqual(ALL_CARDS);
  },
};

export const PriceClearsPressedSection: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(mapSection(canvas, "Section VIP"));

    // VIP ($450) is still in range, so it stays pressed.
    await applyPrice(context, "$200 - $450", "250", "450");
    await expect(mapPressed(canvas)).toEqual([
      "true",
      "false",
      "false",
      "false",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section VIP"]);

    await applyPrice(context, "$250 - $450", "200", "420");
    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(cardTitles(canvas)).toEqual([
      "Section A",
      "Section B",
      "Section C",
    ]);
    await expect(canvas.getByText("3 Listings")).toBeVisible();

    await applyPrice(context, "$200 - $420", "200", "450");
    await expect(mapPressed(canvas)).toEqual(NONE_PRESSED);
    await expect(cardTitles(canvas)).toEqual(ALL_CARDS);
  },
};

// Lawn has no map shape, and C has no ticket type (disabled).
export const NarrowingEdgeCases: Story = {
  args: payload({ ticketTypes: [VIP, A, B, LAWN] }),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);
    const withLawn = ["Section VIP", "Section A", "Section B", "Section Lawn"];

    await expect(cardTitles(canvas)).toEqual(withLawn);

    await userEvent.click(mapSection(canvas, "Section B"));
    await expect(cardTitles(canvas)).toEqual(["Section B"]);

    // Activating disabled C leaves B pressed and the list unchanged.
    await userEvent.click(mapSection(canvas, "Section C"));
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section B"]);

    await userEvent.click(mapSection(canvas, "Section B"));
    await expect(cardTitles(canvas)).toEqual(withLawn);
  },
};

export const SortKeepsPressedSection: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);
    const sectionB = mapSection(canvas, "Section B");

    await userEvent.click(sectionB);
    await userEvent.click(canvas.getByRole("combobox", { name: "Sort by" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Price: low to high" }),
    );

    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    await expect(cardTitles(canvas)).toEqual(["Section B"]);

    await userEvent.click(sectionB);
    await expect(cardTitles(canvas)).toEqual([
      "Section C",
      "Section B",
      "Section A",
      "Section VIP",
    ]);
  },
};

export const MapHoverShowsPrice: Story = {
  args: payload(),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);
    const shape = (name: string) =>
      mapSection(canvas, name).querySelector("path")!;

    await userEvent.hover(shape("Section B"));

    const tooltip = await canvas.findByRole("tooltip");
    await expect(within(tooltip).getByText("B seat")).toBeVisible();
    await expect(within(tooltip).getByText("$300")).toBeVisible();

    await userEvent.unhover(shape("Section B"));

    // While B is pressed, A stays enabled and shows its own price (STAD-14).
    await userEvent.click(mapSection(canvas, "Section B"));
    await userEvent.hover(shape("Section A"));

    await expect(await canvas.findByText("A seat")).toBeVisible();
    await expect(canvas.getAllByRole("tooltip")).toHaveLength(1);
    await expect(
      within(canvas.getByRole("tooltip")).getByText("$400"),
    ).toBeVisible();
  },
};

export const ListingsWithoutSelection: Story = {
  args: payload(),
  play: async ({ canvas }) => {
    await loaded(canvas);

    await expect(canvas.getByRole("list", { name: "Listings" })).toBeVisible();
    await expect(canvas.getByText("4 Listings")).toBeVisible();
    await expect(
      canvas.getByRole("combobox", { name: "Sort by" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("link", { name: "Get a Ticket" }),
    ).toBeNull();
  },
};

export const BackToListings: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    // Quantity 3 and $250 - $450 leave VIP, A and B. Then narrow to B.
    await pickQuantity(context, "3 tickets");
    await applyPrice(context, "$200 - $450", "250", "450");
    await userEvent.click(mapSection(canvas, "Section B"));
    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section B" }),
    );
    await expect(panelHeading(canvas, "Section B")).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", { name: "Back to listings" }),
    );

    await expect(panelHeading(canvas, "Section B")).toBeNull();
    await expect(cardTitles(canvas)).toEqual(["Section B"]);
    await expect(canvas.getByText("1 Listing")).toBeVisible();
    await expect(
      canvas.getByRole("combobox", { name: "Sort by" }),
    ).toBeVisible();
    await expect(
      listings(canvas).queryAllByRole("button", { pressed: true }),
    ).toEqual([]);
    await expect(mapPressed(canvas)).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    await expect(
      canvas.getByRole("combobox", { name: "Tickets" }),
    ).toHaveTextContent(/^3 tickets$/);
    await expect(
      canvas.getByRole("button", { name: "$250 - $450" }),
    ).toBeVisible();
    await expect(heroValue(canvas, "hero-sec")).toBe("—");
    await expect(heroValue(canvas, "hero-price")).toBe("—");
  },
};

export const PanelFollowsQuantity: Story = {
  args: payload(),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section B" }),
    );
    await expect(
      canvas.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["$300/per", "2", "$600"]);
    await expect(canvas.getByText("2 tickets together")).toBeVisible();

    await pickQuantity(context, "3 tickets");

    await expect(panelHeading(canvas, "Section B")).toBeVisible();
    await expect(
      canvas.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["$300/per", "3", "$900"]);
    await expect(canvas.getByText("3 tickets together")).toBeVisible();
    await expect(canvas.queryByText("2 tickets together")).toBeNull();
    await expect(heroValue(canvas, "hero-sec")).toBe("B");
    await expect(heroValue(canvas, "hero-price")).toBe("$300");
  },
};

// URL state (MIG-47 to MIG-51). `parameters.nuqs` seeds the URL and spies on
// its updates (see .storybook/preview.tsx).
type UrlUpdates = ReturnType<typeof fn<OnUrlUpdateFunction>>;

const urlState = (searchParams = "") => ({
  nuqs: { searchParams, onUrlUpdate: fn<OnUrlUpdateFunction>() },
});

const urlUpdates = (parameters: Record<string, unknown>) =>
  (parameters.nuqs as { onUrlUpdate: UrlUpdates }).onUrlUpdate;

const lastUpdate = (parameters: Record<string, unknown>) =>
  urlUpdates(parameters).mock.lastCall![0];

const sortTrigger = (canvas: Canvas) =>
  canvas.getByRole("combobox", { name: "Sort by" });

// Every value differs from its default (2 tickets, $200 - $450, high to low).
export const FiltersFromUrl: Story = {
  args: payload(),
  parameters: urlState("?quantity=3&min=250&max=420&sort=asc"),
  play: async ({ canvas }) => {
    await loaded(canvas);

    await expect(
      canvas.getByRole("combobox", { name: "Tickets" }),
    ).toHaveTextContent(/^3 tickets$/);
    await expect(
      canvas.getByRole("button", { name: "$250 - $420" }),
    ).toBeVisible();
    await expect(sortTrigger(canvas)).toHaveTextContent("Price: low to high");
    await expect(cardTitles(canvas)).toEqual(["Section B", "Section A"]);
  },
};

export const InvalidUrlFiltersFallBack: Story = {
  args: payload(),
  parameters: urlState("?quantity=99&sort=price&min=300"),
  play: async ({ canvas }) => {
    await loaded(canvas);

    await expect(
      canvas.getByRole("combobox", { name: "Tickets" }),
    ).toHaveTextContent(/^2 tickets$/);
    await expect(sortTrigger(canvas)).toHaveTextContent("Price: high to low");
    // `min` without `max` falls back to the price bounds (MIG-50).
    await expect(
      canvas.getByRole("button", { name: "$200 - $450" }),
    ).toBeVisible();
    await expect(cardTitles(canvas)).toEqual(ALL_CARDS);
  },
};

export const QuantityUpdatesUrl: Story = {
  args: payload(),
  parameters: urlState(),
  play: async (context) => {
    const { canvas, parameters } = context;
    await loaded(canvas);

    await pickQuantity(context, "4 tickets");

    await waitFor(() =>
      expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1),
    );
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("quantity")).toBe("4");
    await expect(options.shallow).toBe(true);
    await expect(options.history).toBe("replace");
  },
};

export const PriceUpdatesUrl: Story = {
  args: payload(),
  parameters: urlState(),
  play: async (context) => {
    const { canvas, parameters } = context;
    await loaded(canvas);

    await applyPrice(context, "$200 - $450", "250", "420");

    await waitFor(() =>
      expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1),
    );
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("min")).toBe("250");
    await expect(searchParams.get("max")).toBe("420");
    await expect(options.shallow).toBe(true);
    await expect(options.history).toBe("replace");
  },
};

export const SortUpdatesUrl: Story = {
  args: payload(),
  parameters: urlState(),
  play: async ({ canvas, userEvent, parameters }) => {
    await loaded(canvas);

    await userEvent.click(sortTrigger(canvas));
    await userEvent.click(
      await screen.findByRole("option", { name: "Price: low to high" }),
    );

    await waitFor(() =>
      expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1),
    );
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("sort")).toBe("asc");
    await expect(options.shallow).toBe(true);
    await expect(options.history).toBe("replace");
  },
};

// VIP has dearer rows, A and B do not.
export const FromPrices: Story = {
  args: payload({
    ticketTypes: [B, ticketType("vip", "VIP", 45000, { maxPriceCents: 60000 })],
  }),
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Adele" });

    const cardPrice = (name: string) =>
      listings(canvas).getByRole("button", { name }).textContent;

    await expect(cardPrice("Section VIP")).toContain("From $450/per");
    await expect(cardPrice("Section B")).toContain("$300/per");
    await expect(cardPrice("Section B")).not.toContain("From");

    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section VIP" }),
    );
    await expect(heroValue(canvas, "hero-price")).toBe("From $450");
    await expect(canvas.getAllByRole("definition")[0]).toHaveTextContent(
      "From $450/per",
    );

    await userEvent.click(canvas.getByRole("button", { name: /back/i }));
    await userEvent.click(
      listings(canvas).getByRole("button", { name: "Section B" }),
    );
    await expect(heroValue(canvas, "hero-price")).toBe("$300");
    await expect(canvas.getAllByRole("definition")[0]).toHaveTextContent(
      /^\$300\/per$/,
    );
  },
};
