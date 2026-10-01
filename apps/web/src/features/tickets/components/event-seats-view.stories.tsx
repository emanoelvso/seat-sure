import { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import type { FindTicketTypeSeats } from "@/features/tickets/api/find-ticket-type-seats";
import { zonedIso } from "@/testing/dates";
import {
  frame12Seats,
  frame12UnavailableIds,
} from "@/testing/seat-chart.fixture";
import { concentricSeatMap } from "@/testing/seat-map.fixture";
import { EventSeatsView } from "./event-seats-view";

const event = {
  __typename: "Event" as const,
  id: "3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d",
  name: "Adele",
  type: "concert",
  coverImage: "/artist/map.png",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  startAt: zonedIso(2026, 2, 6, 20, 0),
  endsAt: zonedIso(2026, 2, 6, 22, 30),
  headliner: null,
};

const vip = {
  __typename: "TicketType" as const,
  id: "8e2d4b61-0a3c-4f5e-9d7b-1c2a3b4c5d6e",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
  currency: "USD",
  seatsAvailable: 150,
  maxPerOrder: 6,
  tags: ["discounted", "vip"],
};

// Row 4 is free except seat 08, row 7 is free as in frame 12, and every other
// seat is taken. Row "4" and row "7" are none of the seat numbers they hold.
const unavailableSeatIds = frame12Seats
  .filter((seat) =>
    seat.row === "4" ? seat.number === "08" : frame12UnavailableIds.has(seat.id),
  )
  .map((seat) => seat.id);

const payload = (
  overrides: Partial<Record<keyof FindTicketTypeSeats, unknown>> = {},
) => ({
  ticketTypeSeats: {
    event,
    ticketType: vip,
    seatMap: concentricSeatMap,
    seats: frame12Seats,
    ...overrides,
  } as FindTicketTypeSeats,
  unavailableSeatIds,
});

const urlState = (searchParams: string) => ({ nuqs: { searchParams } });

type Canvas = ReturnType<typeof within>;

const loaded = (canvas: Canvas) =>
  canvas.findByRole("heading", { level: 1, name: "Adele" });

const heroValue = (canvas: Canvas, testId: string) =>
  canvas.getByTestId(testId).textContent;

const chart = (canvas: Canvas) => canvas.getByRole("group", { name: "Seats" });

const seatButton = (canvas: Canvas, row: string, number: string) =>
  within(chart(canvas)).getByRole("button", {
    name: `Row ${row}, Seat ${number}`,
  });

const pressed = (canvas: Canvas, row: string, number: string) =>
  seatButton(canvas, row, number).getAttribute("aria-pressed");

// The picks panel: the section with the "Section VIP" heading.
const panel = (canvas: Canvas) =>
  within(
    canvas
      .getByRole("heading", { level: 2, name: "Section VIP" })
      .closest("section")!,
  );

const pickedNumbers = (canvas: Canvas) =>
  within(panel(canvas).getByRole("list", { name: "Picked seats" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

// Matches the innermost element whose whole text is `text`, across child
// elements.
const wholeText = (text: string) => (_: string, element: Element | null) =>
  element?.textContent === text &&
  !Array.from(element.children).some((child) => child.textContent === text);

const continueButton = (canvas: Canvas) =>
  canvas.getByRole("button", { name: "Continue" });

const meta: Meta<typeof EventSeatsView> = {
  title: "Pages/EventSeats",
  component: EventSeatsView,
  args: payload(),
  parameters: { layout: "fullscreen", ...urlState("?quantity=2") },
} satisfies Meta<typeof EventSeatsView>;

export default meta;

type Story = StoryObj<typeof EventSeatsView>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await loaded(canvas);

    await expect(heroValue(canvas, "hero-sec")).toBe("VIP");
    await expect(heroValue(canvas, "hero-price")).toBe("$450");
    await expect(heroValue(canvas, "hero-row")).toBe("—");
    await expect(heroValue(canvas, "hero-seat")).toBe("—");

    const seats = within(chart(canvas)).getAllByRole("button");
    await expect(seats).toHaveLength(150);
    await expect(
      seats
        .filter((seat) => seat.getAttribute("aria-disabled") === "true")
        .map((seat) => seat.getAttribute("aria-label")),
    ).toEqual(
      frame12Seats
        .filter((seat) => unavailableSeatIds.includes(seat.id))
        .map((seat) => `Row ${seat.row}, Seat ${seat.number}`),
    );

    await expect(
      canvas.getByRole("list", { name: "Seat legend" }),
    ).toBeVisible();
    await expect(continueButton(canvas)).toBeDisabled();
    await expect(
      canvas.getByRole("img", { name: "Section VIP on the seat map" }),
    ).toBeVisible();
  },
};

export const PickTwo: Story = {
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(seatButton(canvas, "4", "09"));
    await expect(continueButton(canvas)).toBeDisabled();
    await userEvent.click(seatButton(canvas, "4", "10"));

    await expect(pressed(canvas, "4", "09")).toBe("true");
    await expect(pressed(canvas, "4", "10")).toBe("true");
    await expect(heroValue(canvas, "hero-row")).toBe("4");
    await expect(heroValue(canvas, "hero-seat")).toBe("10");
    await expect(panel(canvas).getByText(wholeText("Row 4"))).toBeVisible();
    await expect(pickedNumbers(canvas)).toEqual(["09", "10"]);
    await expect(continueButton(canvas)).toBeEnabled();
  },
};

// The earliest pick (10) is neither the lowest nor the latest number.
export const ReplaceEarliest: Story = {
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(seatButton(canvas, "4", "10"));
    await userEvent.click(seatButton(canvas, "4", "09"));
    await userEvent.click(seatButton(canvas, "4", "12"));

    await expect(pressed(canvas, "4", "10")).toBe("false");
    await expect(pressed(canvas, "4", "09")).toBe("true");
    await expect(pressed(canvas, "4", "12")).toBe("true");
    await expect(heroValue(canvas, "hero-seat")).toBe("12");
  },
};

export const OtherRow: Story = {
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(seatButton(canvas, "4", "09"));
    await userEvent.click(seatButton(canvas, "7", "10"));

    await expect(pressed(canvas, "4", "09")).toBe("false");
    await expect(pressed(canvas, "7", "10")).toBe("true");
    await expect(heroValue(canvas, "hero-row")).toBe("7");
    await expect(heroValue(canvas, "hero-seat")).toBe("10");
    await expect(panel(canvas).getByText(wholeText("Row 7"))).toBeVisible();
    await expect(pickedNumbers(canvas)).toEqual(["10"]);
  },
};

// Four tickets, so after releasing the latest pick (11) the previous one (10)
// is neither the first pick nor the lowest or highest number.
export const Release: Story = {
  parameters: urlState("?quantity=4"),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    for (const number of ["09", "12", "10", "11"]) {
      await userEvent.click(seatButton(canvas, "4", number));
    }
    await expect(continueButton(canvas)).toBeEnabled();

    await userEvent.click(seatButton(canvas, "4", "11"));

    await expect(pressed(canvas, "4", "11")).toBe("false");
    await expect(
      ["09", "12", "10"].map((number) => pressed(canvas, "4", number)),
    ).toEqual(["true", "true", "true"]);
    await expect(heroValue(canvas, "hero-seat")).toBe("10");
    await expect(continueButton(canvas)).toBeDisabled();
  },
};

export const Unavailable: Story = {
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await userEvent.click(seatButton(canvas, "4", "09"));
    await userEvent.click(seatButton(canvas, "4", "08"));

    await expect(pressed(canvas, "4", "08")).toBe("false");
    await expect(seatButton(canvas, "4", "08")).toHaveAttribute(
      "data-state",
      "unavailable",
    );
    await expect(pressed(canvas, "4", "09")).toBe("true");
    await expect(heroValue(canvas, "hero-seat")).toBe("09");
    await expect(pickedNumbers(canvas)).toEqual(["09"]);
  },
};

const expectNoSeatSelection = async (canvas: Canvas) => {
  await loaded(canvas);

  await expect(heroValue(canvas, "hero-sec")).toBe("VIP");
  await expect(
    canvas.getByText("Seat selection isn't available for this section."),
  ).toBeVisible();

  await expect(canvas.queryByRole("group", { name: "Seats" })).toBeNull();
  await expect(canvas.queryByRole("combobox", { name: "Tickets" })).toBeNull();
  await expect(
    canvas.queryByRole("heading", { level: 2, name: "Section VIP" }),
  ).toBeNull();
  await expect(canvas.queryByRole("button", { name: "Continue" })).toBeNull();
};

// The seats are kept, so only the missing seat map can hide the chart.
export const NoSeatMap: Story = {
  args: payload({ seatMap: null }),
  play: async ({ canvas }) => expectNoSeatSelection(canvas),
};

export const NoSeats: Story = {
  args: payload({ seats: [] }),
  play: async ({ canvas }) => expectNoSeatSelection(canvas),
};

// Ticket count (SEAT-35 to SEAT-40). VIP sells up to 6 per order.
const quantityPill = (canvas: Canvas) =>
  canvas.getByRole("combobox", { name: "Tickets" });

type PlayContext = Parameters<NonNullable<Story["play"]>>[0];

const pickQuantity = async (
  { canvas, userEvent }: PlayContext,
  label: string,
) => {
  await userEvent.click(quantityPill(canvas));
  await userEvent.click(await screen.findByRole("option", { name: label }));
};

type UrlUpdates = ReturnType<typeof fn<OnUrlUpdateFunction>>;

const spiedUrlState = (searchParams: string) => ({
  nuqs: { searchParams, onUrlUpdate: fn<OnUrlUpdateFunction>() },
});

const urlUpdates = (parameters: Record<string, unknown>) =>
  (parameters.nuqs as { onUrlUpdate: UrlUpdates }).onUrlUpdate;

export const QuantityFromUrl: Story = {
  parameters: urlState("?quantity=3"),
  play: async ({ canvas, userEvent }) => {
    await loaded(canvas);

    await expect(quantityPill(canvas)).toHaveTextContent(/^3 tickets$/);

    await userEvent.click(quantityPill(canvas));
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

const expectDefaultQuantity = async (canvas: Canvas) => {
  await loaded(canvas);
  await expect(quantityPill(canvas)).toHaveTextContent(/^2 tickets$/);
};

export const QuantityBelowOneFallsBack: Story = {
  parameters: urlState("?quantity=0"),
  play: async ({ canvas }) => expectDefaultQuantity(canvas),
};

export const QuantityAboveMaxFallsBack: Story = {
  parameters: urlState("?quantity=7"),
  play: async ({ canvas }) => expectDefaultQuantity(canvas),
};

export const QuantityNotANumberFallsBack: Story = {
  parameters: urlState("?quantity=abc"),
  play: async ({ canvas }) => expectDefaultQuantity(canvas),
};

export const NoQuantityFallsBack: Story = {
  parameters: urlState(""),
  play: async ({ canvas }) => expectDefaultQuantity(canvas),
};

// `?quantity=2` is above this section's maximum.
export const OneTicketPerOrder: Story = {
  args: payload({ ticketType: { ...vip, maxPerOrder: 1 } }),
  play: async ({ canvas }) => {
    await loaded(canvas);
    await expect(quantityPill(canvas)).toHaveTextContent(/^1 ticket$/);
  },
};

// The first pick (10) is neither the lowest nor the latest number.
export const LowerQuantityKeepsFirstPicks: Story = {
  parameters: spiedUrlState("?quantity=2"),
  play: async (context) => {
    const { canvas, parameters, userEvent } = context;
    await loaded(canvas);

    await userEvent.click(seatButton(canvas, "4", "10"));
    await userEvent.click(seatButton(canvas, "4", "09"));
    await pickQuantity(context, "1 ticket");

    await waitFor(() =>
      expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1),
    );
    const { searchParams, options } = urlUpdates(parameters).mock.lastCall![0];
    await expect(searchParams.get("quantity")).toBe("1");
    await expect(options.history).toBe("replace");

    await expect(quantityPill(canvas)).toHaveTextContent(/^1 ticket$/);
    await expect(pressed(canvas, "4", "10")).toBe("true");
    await expect(pressed(canvas, "4", "09")).toBe("false");
    await expect(heroValue(canvas, "hero-seat")).toBe("10");
  },
};

const expectNoticeAboveChart = async (canvas: Canvas, text: string) => {
  const notice = canvas.getByText(text);

  await expect(notice).toBeVisible();
  await expect(
    notice.compareDocumentPosition(chart(canvas)) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
};

export const AllSeatsTaken: Story = {
  args: {
    ...payload(),
    unavailableSeatIds: frame12Seats.map((seat) => seat.id),
  },
  play: async ({ canvas }) => {
    await loaded(canvas);
    await expectNoticeAboveChart(canvas, "All seats in this section are taken.");
  },
};

// The freest row (4) has 3 free seats. Row 7 has 2.
const threeFreeInARow = {
  ...payload(),
  unavailableSeatIds: frame12Seats
    .filter(
      (seat) =>
        !(seat.row === "4" && ["09", "10", "11"].includes(seat.number)) &&
        !(seat.row === "7" && ["01", "02"].includes(seat.number)),
    )
    .map((seat) => seat.id),
};

export const NotEnoughFreeSeatsInARow: Story = {
  args: threeFreeInARow,
  parameters: urlState("?quantity=4"),
  play: async ({ canvas }) => {
    await loaded(canvas);
    await expectNoticeAboveChart(
      canvas,
      "No row has 4 free seats together. Pick fewer tickets.",
    );
  },
};

export const EnoughFreeSeatsInARow: Story = {
  args: threeFreeInARow,
  parameters: urlState("?quantity=3"),
  play: async (context) => {
    const { canvas } = context;
    await loaded(canvas);

    await expect(canvas.queryByText(/free seats together/)).toBeNull();
    await expect(
      canvas.queryByText("All seats in this section are taken."),
    ).toBeNull();

    await pickQuantity(context, "4 tickets");
    await expectNoticeAboveChart(
      canvas,
      "No row has 4 free seats together. Pick fewer tickets.",
    );
  },
};
