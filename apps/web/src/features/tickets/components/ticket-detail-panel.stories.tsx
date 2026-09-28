import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { concentricSeatMap } from "@/components/SeatMap.fixture";
import {
  GqlTicketsEvent,
  GqlTicketType,
} from "@/graphql/queries/find-event-tickets";
import { TicketDetailPanel } from "./ticket-detail-panel";

// Distinct ids, so a link built from the wrong one can't pass.
const EVENT_ID = "3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d";
const TICKET_TYPE_ID = "8e2d4b61-0a3c-4f5e-9d7b-1c2a3b4c5d6e";

const event: GqlTicketsEvent = {
  id: EVENT_ID,
  name: "Adele",
  type: "concert",
  coverImage: "/artist/map.png",
  venue: "The Colosseum at Caesars Palace",
  city: "Las Vegas",
  country: "USA",
  startAt: new Date(2026, 2, 6, 20, 0).toISOString(),
  endsAt: new Date(2026, 2, 6, 22, 30).toISOString(),
};

const ticketType: GqlTicketType = {
  id: TICKET_TYPE_ID,
  sectionKey: "b",
  name: "B",
  priceCents: 30000,
  currency: "USD",
  seatsAvailable: 100,
  maxPerOrder: 4,
  tags: ["discounted", "best seller"],
};

const meta: Meta<typeof TicketDetailPanel> = {
  title: "Features/Tickets/TicketDetailPanel",
  component: TicketDetailPanel,
  // Quantity 3, so the total can't be mistaken for price × 2.
  args: {
    event,
    ticketType,
    quantity: 3,
    seatMap: concentricSeatMap,
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 392 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TicketDetailPanel>;

export default meta;

type Story = StoryObj<typeof TicketDetailPanel>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Section B" }),
    ).toBeVisible();

    await expect(
      canvas.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["Price", "Tickets", "Total"]);
    await expect(
      canvas.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["$300/per", "3", "$900"]);
  },
};

export const Details: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("3 tickets together")).toBeVisible();
    await expect(canvas.getByText("Mar 06 - 2026")).toBeVisible();
    await expect(canvas.getByText("8:00 PM - 10:30 PM")).toBeVisible();

    const tags = within(canvas.getByRole("list", { name: "Tags" }));
    await expect(
      tags.getAllByRole("listitem").map((tag) => tag.textContent),
    ).toEqual(["discounted", "best seller"]);
  },
};

// STAD-24 dates the panel by startAt. An event crossing midnight has a
// different end day, so reading endsAt would show "Mar 07 - 2026".
export const DateFromStartAcrossMidnight: Story = {
  args: {
    event: {
      ...event,
      startAt: new Date(2026, 2, 6, 23, 0).toISOString(),
      endsAt: new Date(2026, 2, 7, 1, 30).toISOString(),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mar 06 - 2026")).toBeVisible();
    await expect(canvas.queryByText("Mar 07 - 2026")).toBeNull();
    await expect(canvas.getByText("11:00 PM - 1:30 AM")).toBeVisible();
  },
};

export const OneTicket: Story = {
  args: { quantity: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 ticket")).toBeVisible();
    await expect(canvas.queryByText(/together/)).toBeNull();
    await expect(
      canvas.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["$300/per", "1", "$300"]);
  },
};

export const GetATicketLink: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Get a Ticket" }),
    ).toHaveAttribute(
      "href",
      `/events/${EVENT_ID}/tickets/${TICKET_TYPE_ID}?quantity=3`,
    );
  },
};

export const MiniMap: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", { name: "Section B on the seat map" }),
    ).toBeVisible();
  },
};

export const BackToListings: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Back to listings" }),
    );

    await expect(args.onBack).toHaveBeenCalledTimes(1);
  },
};
