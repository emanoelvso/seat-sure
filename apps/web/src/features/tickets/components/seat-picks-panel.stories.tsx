import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createRef } from "react";
import { expect, fn, within } from "storybook/test";
import type {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import { zonedIso } from "@/testing/dates";
import { SeatPicksPanel } from "./seat-picks-panel";

const event: TicketsEvent = {
  __typename: "Event",
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

const vip: TicketType = {
  __typename: "TicketType",
  id: "8e2d4b61-0a3c-4f5e-9d7b-1c2a3b4c5d6e",
  sectionKey: "vip",
  name: "VIP",
  priceCents: 45000,
  currency: "USD",
  seatsAvailable: 150,
  maxPerOrder: 8,
  tags: ["discounted", "vip"],
};

// Row "4" is none of the seat numbers, and "2" sorts after "10" as text.
const seat = (number: string, x: number): Seat => ({
  __typename: "Seat",
  id: `seat-4-${number}`,
  row: "4",
  number,
  x,
  y: 190,
});

const seat10 = seat("10", 553);
const seat2 = seat("2", 121);
const seat5 = seat("5", 283);

// Matches the innermost element whose whole text is `text`, across child
// elements.
const wholeText = (text: string) => (_: string, element: Element | null) =>
  element?.textContent === text &&
  !Array.from(element.children).some((child) => child.textContent === text);

const meta: Meta<typeof SeatPicksPanel> = {
  title: "Features/Tickets/SeatPicksPanel",
  component: SeatPicksPanel,
  // Quantity 3, so the total can't be mistaken for price × 2.
  args: {
    event,
    ticketType: vip,
    quantity: 3,
    pickedSeats: [seat10, seat2],
    onContinue: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 392 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatPicksPanel>;

export default meta;

type Story = StoryObj<typeof SeatPicksPanel>;

export const Totals: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Section VIP" }),
    ).toBeVisible();

    await expect(
      canvas.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["Price", "Tickets", "Total"]);
    await expect(
      canvas.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["$450/per", "3", "$1,350"]);
  },
};

export const PickedRowAndSeats: Story = {
  play: async ({ canvas }) => {
    const row = canvas.getByText(wholeText("Row 4"));
    const picked = canvas.getByRole("list", { name: "Picked seats" });

    await expect(row).toBeVisible();
    await expect(
      within(picked)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["2", "10"]);
    await expect(
      row.compareDocumentPosition(picked) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

export const NoPicks: Story = {
  args: { pickedSeats: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(wholeText("Row —"))).toBeVisible();
    await expect(
      canvas.queryByRole("list", { name: "Picked seats" }),
    ).toBeNull();
  },
};

export const Facts: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("3 tickets together")).toBeVisible();
    await expect(canvas.getByText("Mar 06 - 2026")).toBeVisible();
    await expect(canvas.getByText("8:00 PM - 10:30 PM")).toBeVisible();

    const tags = within(canvas.getByRole("list", { name: "Tags" }));
    await expect(
      tags.getAllByRole("listitem").map((tag) => tag.textContent),
    ).toEqual(["discounted", "vip"]);
  },
};

export const OneTicket: Story = {
  args: { quantity: 1, pickedSeats: [seat2] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 ticket")).toBeVisible();
    await expect(canvas.queryByText(/together/)).toBeNull();
  },
};

export const NoTags: Story = {
  args: { ticketType: { ...vip, tags: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("list", { name: "Tags" })).toBeNull();
  },
};

export const ContinueDisabledUntilAllPicked: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeDisabled();
  },
};

export const ContinueWhenAllPicked: Story = {
  args: { pickedSeats: [seat10, seat2, seat5] },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Continue" });

    await expect(button).toBeEnabled();
    await userEvent.click(button);

    await expect(args.onContinue).toHaveBeenCalledTimes(1);
  },
};

// The page focuses Continue through this ref when the review dialog closes.
const continueRef = createRef<HTMLButtonElement>();

export const ContinueRef: Story = {
  args: { continueRef },
  play: async ({ canvas }) => {
    await expect(continueRef.current).toBe(
      canvas.getByRole("button", { name: "Continue" }),
    );
  },
};
