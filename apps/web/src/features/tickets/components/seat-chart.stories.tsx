import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import type { TicketType } from "@/features/tickets/api/find-event-tickets";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import {
  findSeat,
  frame12Seats,
  frame12UnavailableIds,
} from "@/testing/seat-chart.fixture";
import { SeatChart } from "./seat-chart";

// The theme tokens of the frames' seat colors: white, neutral-300, primary.
const WHITE = "rgb(255, 255, 255)";
const NEUTRAL_300 = "rgb(69, 69, 69)";
const PRIMARY = "rgb(193, 79, 230)";

const seatName = (seat: Seat) => `Row ${seat.row}, Seat ${seat.number}`;

type Canvas = ReturnType<typeof within>;

const chart = (canvas: Canvas) => canvas.getByRole("group", { name: "Seats" });

const seatButton = (canvas: Canvas, row: string, number: string) =>
  within(chart(canvas)).getByRole("button", {
    name: `Row ${row}, Seat ${number}`,
  });

const glyphFill = (button: Element) =>
  getComputedStyle(button.querySelector("path")!).fill;

const center = (box: DOMRect) => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
});

// The section the seats belong to: the tooltip reads its name and price.
const vip: TicketType = {
  __typename: "TicketType",
  id: "tt-vip",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
  maxPriceCents: 45000,
  currency: "USD",
  seatsAvailable: 150,
  maxPerOrder: 8,
  tags: [],
};

// Matches the one element whose whole text is `text`, across child elements.
const wholeText = (text: string) => (_: string, element: Element | null) =>
  element?.textContent === text;

const expectSeatTooltip = async (
  tooltip: HTMLElement,
  row: string,
  number: string,
) => {
  const inTooltip = within(tooltip);

  await expect(inTooltip.getByText("VIP seat")).toBeVisible();
  await expect(inTooltip.getByText("$450")).toBeVisible();
  await expect(inTooltip.getByText(wholeText(`Row ${row}`))).toBeVisible();
  await expect(inTooltip.getByText(wholeText(`Seat ${number}`))).toBeVisible();
};

const meta: Meta<typeof SeatChart> = {
  title: "Features/Tickets/SeatChart",
  component: SeatChart,
  args: {
    seats: frame12Seats,
    unavailableIds: frame12UnavailableIds,
    pickedIds: [],
    ticketType: vip,
    onPick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 808 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatChart>;

export default meta;

type Story = StoryObj<typeof SeatChart>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const svg = chart(canvas);
    const buttons = within(svg).getAllByRole("button");

    await expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual(
      frame12Seats.map(seatName),
    );

    // Each seat is centered on its x/y, mapped to the screen by the chart.
    const toScreen = (svg as unknown as SVGSVGElement).getScreenCTM()!;
    for (const [index, seat] of frame12Seats.entries()) {
      const expected = new DOMPoint(seat.x, seat.y).matrixTransform(toScreen);
      const actual = center(buttons[index].getBoundingClientRect());

      await expect(actual.x).toBeCloseTo(expected.x, 0);
      await expect(actual.y).toBeCloseTo(expected.y, 0);
    }
  },
};

// The extra id isn't a seat of this section: it's ignored.
export const SeatStates: Story = {
  args: {
    unavailableIds: new Set([...frame12UnavailableIds, "seat-of-another-section"]),
  },
  play: async ({ canvas }) => {
    const buttons = within(chart(canvas)).getAllByRole("button");

    await expect(
      buttons.map((button) => [
        button.getAttribute("aria-disabled"),
        button.getAttribute("data-state"),
      ]),
    ).toEqual(
      frame12Seats.map((seat) =>
        frame12UnavailableIds.has(seat.id)
          ? ["true", "unavailable"]
          : ["false", "available"],
      ),
    );
    await expect(
      buttons.filter((button) => button.getAttribute("aria-disabled") === "true"),
    ).toHaveLength(141);

    await expect(glyphFill(seatButton(canvas, "7", "03"))).toBe(WHITE);
    await expect(glyphFill(seatButton(canvas, "7", "04"))).toBe(NEUTRAL_300);
  },
};

export const PickWithPointer: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(seatButton(canvas, "7", "10"));

    await expect(args.onPick).toHaveBeenCalledTimes(1);
    await expect(args.onPick).toHaveBeenCalledWith(findSeat("7", "10"));
  },
};

export const PickWithKeyboard: Story = {
  play: async ({ canvas, args, userEvent }) => {
    // Every seat is a tab stop, in chart order.
    await userEvent.tab();
    await expect(seatButton(canvas, "1", "01")).toHaveFocus();
    await userEvent.tab();
    await expect(seatButton(canvas, "1", "02")).toHaveFocus();

    (seatButton(canvas, "7", "01") as unknown as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onPick).toHaveBeenLastCalledWith(findSeat("7", "01"));

    await userEvent.tab();
    await expect(seatButton(canvas, "7", "02")).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(args.onPick).toHaveBeenLastCalledWith(findSeat("7", "02"));

    await expect(args.onPick).toHaveBeenCalledTimes(2);
  },
};

export const UnavailableSeatIsNotPicked: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const taken = seatButton(canvas, "7", "04");

    await userEvent.click(taken);
    (taken as unknown as HTMLElement).focus();
    await expect(taken).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    await expect(args.onPick).not.toHaveBeenCalled();

    // Its free neighbor, picked the same way, is reported.
    await userEvent.click(seatButton(canvas, "7", "03"));
    await expect(args.onPick).toHaveBeenCalledTimes(1);
    await expect(args.onPick).toHaveBeenCalledWith(findSeat("7", "03"));
  },
};

export const PickedSeats: Story = {
  args: { pickedIds: [findSeat("7", "08").id, findSeat("7", "06").id] },
  play: async ({ canvas, args, userEvent }) => {
    const buttons = within(chart(canvas)).getAllByRole("button");
    const picked = new Set(["Row 7, Seat 06", "Row 7, Seat 08"]);

    await expect(
      buttons.map((button) => [
        button.getAttribute("aria-label"),
        button.getAttribute("aria-pressed"),
      ]),
    ).toEqual(
      frame12Seats.map((seat) => [
        seatName(seat),
        String(picked.has(seatName(seat))),
      ]),
    );
    await expect(seatButton(canvas, "7", "08")).toHaveAttribute(
      "data-state",
      "picked",
    );
    await expect(glyphFill(seatButton(canvas, "7", "08"))).toBe(PRIMARY);
    await expect(glyphFill(seatButton(canvas, "7", "07"))).toBe(WHITE);

    // A picked seat still reports the pick, so the page can release it.
    await userEvent.click(seatButton(canvas, "7", "08"));
    await expect(args.onPick).toHaveBeenCalledTimes(1);
    await expect(args.onPick).toHaveBeenCalledWith(findSeat("7", "08"));
  },
};

export const RowAndColumnLabels: Story = {
  play: async ({ canvas }) => {
    const svg = chart(canvas);
    const box = (row: string, number: string) =>
      seatButton(canvas, row, number).getBoundingClientRect();
    const rowSeats = (row: string) =>
      frame12Seats.filter((seat) => seat.row === row);

    // One label per row, right of that row's seats and level with its
    // rightmost seat.
    const rowTexts = Array.from(
      within(svg).getByTestId("row-labels").querySelectorAll("text"),
    );
    await expect(rowTexts.map((text) => text.textContent).sort()).toEqual(
      [...new Set(frame12Seats.map((seat) => seat.row))].sort(),
    );
    for (const text of rowTexts) {
      const seats = rowSeats(text.textContent!).map((seat) =>
        box(seat.row, seat.number),
      );
      const rightmost = seats.reduce((a, b) => (b.right > a.right ? b : a));
      const label = text.getBoundingClientRect();

      await expect(label.left).toBeGreaterThan(rightmost.right);
      await expect(
        Math.abs(center(label).y - center(rightmost).y),
      ).toBeLessThan(3);
    }

    // The bottom row's seat numbers, each under its own seat.
    const columnTexts = Array.from(
      within(svg).getByTestId("column-labels").querySelectorAll("text"),
    );
    await expect(columnTexts.map((text) => text.textContent).sort()).toEqual(
      rowSeats("12").map((seat) => seat.number),
    );
    const lowest = Math.max(
      ...rowSeats("12").map((seat) => box(seat.row, seat.number).bottom),
    );
    for (const text of columnTexts) {
      const label = text.getBoundingClientRect();
      const seat = box("12", text.textContent!);

      await expect(label.top).toBeGreaterThan(lowest);
      await expect(Math.abs(center(label).x - center(seat).x)).toBeLessThan(2);
    }
  },
};

// Row 7 ≠ seat 10, so a tooltip that swaps them can't pass.
export const HoverShowsSeatTooltip: Story = {
  play: async ({ canvas, userEvent }) => {
    const seat = seatButton(canvas, "7", "10");

    await userEvent.hover(seat);

    const tooltip = await canvas.findByRole("tooltip");
    await expect(canvas.getAllByRole("tooltip")).toHaveLength(1);
    await expectSeatTooltip(tooltip, "7", "10");

    // Anchored under the hovered seat.
    const seatBox = seat.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    await expect(tooltipBox.top).toBeGreaterThanOrEqual(seatBox.bottom);
    await expect(
      Math.abs(center(tooltipBox).x - center(seatBox).x),
    ).toBeLessThan(1);

    await userEvent.unhover(seat);

    await expect(canvas.queryByRole("tooltip")).toBeNull();
  },
};

export const FocusShowsSeatTooltip: Story = {
  play: async ({ canvas, userEvent }) => {
    const seat = seatButton(canvas, "7", "10");

    // Seat 09 is taken. Tab moves on to seat 10.
    (seatButton(canvas, "7", "09") as unknown as HTMLElement).focus();
    await expect(canvas.queryByRole("tooltip")).toBeNull();
    await userEvent.tab();
    await expect(seat).toHaveFocus();

    const tooltip = await canvas.findByRole("tooltip");
    await expectSeatTooltip(tooltip, "7", "10");
    await expect(tooltip.id).not.toBe("");
    await expect(seat).toHaveAttribute("aria-describedby", tooltip.id);

    await userEvent.tab();

    await expect(canvas.queryByRole("tooltip")).toBeNull();
    await expect(seat).not.toHaveAttribute("aria-describedby");
  },
};

export const UnavailableSeatHasNoTooltip: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(seatButton(canvas, "7", "09"));

    await expect(canvas.queryByRole("tooltip")).toBeNull();

    // The same pointer path over its free neighbor does show one.
    await userEvent.hover(seatButton(canvas, "7", "08"));

    await expectSeatTooltip(await canvas.findByRole("tooltip"), "7", "08");
  },
};
