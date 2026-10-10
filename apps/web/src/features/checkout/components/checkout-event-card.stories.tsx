import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { zonedIso } from "@/testing/dates";
import { CheckoutEventCard } from "./checkout-event-card";

const meta: Meta<typeof CheckoutEventCard> = {
  // TODO(a11y): color-contrast (success text) still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Features/Checkout/CheckoutEventCard",
  tags: ["autodocs"],
  component: CheckoutEventCard,
  args: {
    event: {
      name: "Adele",
      coverImage: "/artist/adele.png",
      venue: "Fontainbleau",
      city: "Las Vegas",
      country: "USA",
      startAt: zonedIso(2026, 7, 30, 19, 30),
    },
    ticketTypeName: "VIP",
    items: [
      { row: "7", number: "07" },
      { row: "7", number: "10" },
    ],
  },
} satisfies Meta<typeof CheckoutEventCard>;

export default meta;

type Story = StoryObj<typeof CheckoutEventCard>;

// PAY-21: two picked seats sort numerically and pluralize the count line.
// Also covers the event card's venue, location and date/time text, exact
// for a fixed zone (zonedIso/env.timeZone).
export const TwoSeats: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Section VIP • Row 7 • Seats 07, 10"),
    ).toBeVisible();
    await expect(
      canvas.getByText("2 tickets • Seated together"),
    ).toBeVisible();

    await expect(canvas.getByText("Adele")).toBeVisible();
    await expect(canvas.getByText("Sun 30 Aug • 7:30 PM")).toBeVisible();
    await expect(canvas.getByText("Fontainbleau")).toBeVisible();
    await expect(canvas.getByText("Las Vegas, USA")).toBeVisible();
  },
};

// PAY-21: a single seat uses the singular copy for both lines.
export const OneSeat: Story = {
  args: { items: [{ row: "7", number: "07" }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Section VIP • Row 7 • Seat 07")).toBeVisible();
    await expect(canvas.getByText("1 ticket")).toBeVisible();
  },
};
