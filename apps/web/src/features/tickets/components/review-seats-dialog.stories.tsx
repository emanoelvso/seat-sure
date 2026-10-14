import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import type {
  TicketsEvent,
  TicketType,
} from "@/features/tickets/api/find-event-tickets";
import type { Seat } from "@/features/tickets/api/find-ticket-type-seats";
import { zonedIso } from "@/testing/dates";
import { ReviewSeatsDialog } from "./review-seats-dialog";

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
  maxPriceCents: 45000,
  currency: "USD",
  seatsAvailable: 150,
  maxPerOrder: 8,
  tags: ["discounted", "vip"],
};

// Row "4" is none of the seat numbers. The picks come in as 10, then 09.
const seat = (number: string, x: number): Seat => ({
  __typename: "Seat",
  id: `seat-4-${number}`,
  row: "4",
  number,
  x,
  y: 190,
  priceCents: 45000,
  perks: [],
});

type Canvas = ReturnType<typeof within>;

const dialog = (canvas: Canvas) =>
  canvas.getByRole("dialog", { name: "Ticket Information" }) as HTMLDialogElement;

const meta: Meta<typeof ReviewSeatsDialog> = {
  title: "Features/Tickets/ReviewSeatsDialog",
  component: ReviewSeatsDialog,
  args: {
    open: true,
    onClose: fn(),
    eventId: "e1",
    ticketTypeId: "t1",
    event,
    ticketType: vip,
    pickedSeats: [seat("10", 553), seat("09", 499)],
  },
} satisfies Meta<typeof ReviewSeatsDialog>;

export default meta;

type Story = StoryObj<typeof ReviewSeatsDialog>;

export const Open: Story = {
  play: async ({ canvas }) => {
    const review = dialog(canvas);
    const inDialog = within(review);

    await expect(review.open).toBe(true);
    await expect(review.matches(":modal")).toBe(true);

    const tags = within(inDialog.getByRole("list", { name: "Tags" }));
    await expect(
      tags.getAllByRole("listitem").map((tag) => tag.textContent),
    ).toEqual(["discounted", "vip"]);
    await expect(inDialog.getByText("2 tickets together")).toBeVisible();
    await expect(inDialog.getByText("Mar 06 - 2026")).toBeVisible();
    await expect(
      inDialog.getByText("The Colosseum at Caesars Palace - Las Vegas, USA"),
    ).toBeVisible();
    await expect(inDialog.getByText("8:00 PM - 10:30 PM")).toBeVisible();

    // The definition paired with the "ROW" term.
    const rowTerm = inDialog.getByText("ROW");
    await expect(rowTerm.tagName).toBe("DT");
    await expect(rowTerm.nextElementSibling?.textContent).toBe("4");
  },
};

export const SeatLines: Story = {
  play: async ({ canvas }) => {
    const inDialog = within(dialog(canvas));

    await expect(
      inDialog.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["ROW", "Seat 09", "Seat 10", "Total"]);
    await expect(
      inDialog.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["4", "$450", "$450", "$900"]);
  },
};

export const OneTicket: Story = {
  args: { pickedSeats: [seat("09", 499)] },
  play: async ({ canvas }) => {
    const inDialog = within(dialog(canvas));

    await expect(inDialog.getByText("1 ticket")).toBeVisible();
    await expect(inDialog.queryByText(/together/)).toBeNull();
    await expect(
      inDialog.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["ROW", "Seat 09", "Total"]);
    await expect(
      inDialog.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["4", "$450", "$450"]);
  },
};

// Three picks, out of number order: 10, 02, 09.
export const ThreeTickets: Story = {
  args: { pickedSeats: [seat("10", 553), seat("02", 121), seat("09", 499)] },
  play: async ({ canvas }) => {
    const inDialog = within(dialog(canvas));

    await expect(inDialog.getByText("3 tickets together")).toBeVisible();
    await expect(inDialog.queryByText("2 tickets together")).toBeNull();
    await expect(
      inDialog.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["ROW", "Seat 02", "Seat 09", "Seat 10", "Total"]);
    await expect(
      inDialog.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual(["4", "$450", "$450", "$450", "$1,350"]);
  },
};

const pickedSeatsInOrder = [
  {
    __typename: "Seat" as const,
    id: "s07",
    row: "4",
    number: "07",
    x: 445,
    y: 190,
    priceCents: 45000,
    perks: [],
  },
  {
    __typename: "Seat" as const,
    id: "s10",
    row: "4",
    number: "10",
    x: 553,
    y: 190,
    priceCents: 45000,
    perks: [],
  },
];

// PAY-01: "Continue" is a link to checkout with the seats in pick order (07
// then 10), not sorted by number. Supersedes SEAT-44.
export const ContinueLink: Story = {
  args: { pickedSeats: pickedSeatsInOrder },
  play: async ({ canvas }) => {
    const inDialog = within(dialog(canvas));

    const continueLink = inDialog.getByRole("link", { name: "Continue" });
    await expect(continueLink).toHaveAttribute(
      "href",
      "/events/e1/tickets/t1/checkout?seats=s07,s10",
    );
  },
};

// PAY-02: the old "not available yet" note is gone. Supersedes SEAT-44.
export const NoUnavailableNote: Story = {
  args: { pickedSeats: pickedSeatsInOrder },
  play: async ({ canvas }) => {
    const inDialog = within(dialog(canvas));

    await expect(
      inDialog.queryByText("Checkout isn't available yet"),
    ).toBeNull();
  },
};

export const ChangeSeatCloses: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const review = dialog(canvas);

    await userEvent.click(
      within(review).getByRole("button", { name: "Change Seat" }),
    );

    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(review.open).toBe(false);
  },
};

export const EscapeCloses: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const review = dialog(canvas);

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(review.open).toBe(false);
  },
};
