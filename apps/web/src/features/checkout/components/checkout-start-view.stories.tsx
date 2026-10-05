import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import type { StartCheckoutState } from "@/features/checkout/api/start-checkout-action";
import { zonedIso } from "@/testing/dates";
import { CheckoutStartView } from "./checkout-start-view";

const event = {
  id: "event-12",
  name: "Adele",
  coverImage: "/artist/adele.png",
  venue: "Fontainbleau",
  city: "Las Vegas",
  country: "USA",
  startAt: zonedIso(2026, 7, 30, 19, 30),
};

const ticketType = { id: "type-34", name: "VIP" };

// Picked in order: seat 10, then seat 07.
const seats = [
  { id: "seat-10", row: "7", number: "10" },
  { id: "seat-07", row: "7", number: "07" },
];

const meta: Meta<typeof CheckoutStartView> = {
  title: "Features/Checkout/CheckoutStartView",
  tags: ["autodocs"],
  component: CheckoutStartView,
  args: {
    event,
    ticketType,
    seats,
    startAction: fn(async (): Promise<StartCheckoutState> => ({})),
  },
} satisfies Meta<typeof CheckoutStartView>;

export default meta;

type Story = StoryObj<typeof CheckoutStartView>;

function digitBoxText(canvasElement: HTMLElement) {
  return Array.from(
    canvasElement.querySelectorAll("[data-countdown-digit='true']"),
  ).map((el) => el.textContent);
}

// PAY-04: the start page opens with the frozen 10:00 timer, the read-only
// quantity and the LockedPriceDialog already open.
export const Layout: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("definition")).toHaveTextContent(/^2$/);
    await expect(
      canvas.getByRole("dialog", {
        name: "You have 10 minutes to complete your purchase",
      }),
    ).toBeVisible();
    await expect(digitBoxText(canvasElement)).toEqual(["1", "0", "0", "0"]);
  },
};

// PAY-16: "Start" passes the seat ids in pick order, not sorted by number.
export const Start: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const dialog = within(
      canvas.getByRole("dialog", {
        name: "You have 10 minutes to complete your purchase",
      }),
    );

    await userEvent.click(dialog.getByRole("button", { name: "Start" }));

    await waitFor(() =>
      expect(args.startAction).toHaveBeenCalledWith(
        {},
        {
          eventId: "event-12",
          ticketTypeId: "type-34",
          seatIds: ["seat-10", "seat-07"],
        },
      ),
    );
  },
};

// PAY-17: the dialog's "Choose seats" link returns to the seat page with the
// picked quantity.
export const ChooseSeats: Story = {
  args: {
    startAction: fn(
      async (): Promise<StartCheckoutState> => ({
        error: "SEATS_UNAVAILABLE",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const dialog = within(
      canvas.getByRole("dialog", {
        name: "You have 10 minutes to complete your purchase",
      }),
    );

    await userEvent.click(dialog.getByRole("button", { name: "Start" }));

    const chooseSeats = await dialog.findByRole("link", {
      name: "Choose seats",
    });
    await expect(chooseSeats).toHaveAttribute(
      "href",
      "/events/event-12/tickets/type-34?quantity=2",
    );
  },
};
