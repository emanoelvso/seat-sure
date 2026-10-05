import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import type { StartCheckoutState } from "@/features/checkout/api/start-checkout-action";
import { LockedPriceDialog } from "./locked-price-dialog";

const meta: Meta<typeof LockedPriceDialog> = {
  title: "Features/Checkout/LockedPriceDialog",
  tags: ["autodocs"],
  component: LockedPriceDialog,
  args: {
    startAction: fn(async (): Promise<StartCheckoutState> => ({})),
    payload: {
      eventId: "event-1",
      ticketTypeId: "ticket-type-1",
      seatIds: ["seat-07", "seat-10"],
    },
    seatsHref: "/events/event-1/tickets/ticket-type-1?quantity=2",
  },
} satisfies Meta<typeof LockedPriceDialog>;

export default meta;

type Story = StoryObj<typeof LockedPriceDialog>;

type Canvas = ReturnType<typeof within>;

const dialog = (canvas: Canvas) =>
  canvas.getByRole("dialog", {
    name: "You have 10 minutes to complete your purchase",
  }) as HTMLDialogElement;

// PAY-04: the dialog opens as soon as it mounts, named by its heading, with
// the exact copy.
export const OpenOnMount: Story = {
  play: async ({ canvas }) => {
    const modal = dialog(canvas);
    await expect(modal.open).toBe(true);
    await expect(modal.matches(":modal")).toBe(true);

    const inDialog = within(modal);
    await expect(
      inDialog.getByText("The price of your tickets will be locked during this time"),
    ).toBeVisible();
    await expect(inDialog.getByRole("button", { name: "Start" })).toBeEnabled();
  },
};

// PAY-16: "Start" calls the action with the payload (seat ids in order) and
// disables itself while the action is pending. The action stays pending
// until resolved at the end, so "pending" can be asserted without a race -
// resolving it afterwards avoids leaving a dangling transition for later
// stories in the same browser session.
export const StartSubmits: Story = {
  args: {
    startAction: fn(() => new Promise<StartCheckoutState>(() => {})),
  },
  play: async ({ canvas, args, userEvent }) => {
    let resolveAction!: (state: StartCheckoutState) => void;
    (args.startAction as ReturnType<typeof fn>).mockImplementation(
      () => new Promise<StartCheckoutState>((resolve) => (resolveAction = resolve)),
    );

    const inDialog = within(dialog(canvas));
    const start = inDialog.getByRole("button", { name: "Start" });

    await userEvent.click(start);

    await waitFor(() =>
      expect(args.startAction).toHaveBeenCalledWith(
        {},
        {
          eventId: "event-1",
          ticketTypeId: "ticket-type-1",
          seatIds: ["seat-07", "seat-10"],
        },
      ),
    );
    await waitFor(() => expect(start).toBeDisabled());

    resolveAction({});
  },
};

// PAY-17/implicit: Escape doesn't dismiss the dialog.
export const EscapeKeepsOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    const modal = dialog(canvas);

    await userEvent.keyboard("{Escape}");

    await expect(modal.open).toBe(true);
  },
};

// PAY-17: SEATS_UNAVAILABLE shows the exact copy and a "Choose seats" link.
export const SeatsUnavailable: Story = {
  args: {
    startAction: fn(
      async (): Promise<StartCheckoutState> => ({
        error: "SEATS_UNAVAILABLE",
      }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const inDialog = within(dialog(canvas));

    await userEvent.click(inDialog.getByRole("button", { name: "Start" }));

    await waitFor(() =>
      expect(
        inDialog.getByText(
          "Some of your seats were just taken. Pick your seats again.",
        ),
      ).toBeVisible(),
    );

    const chooseSeats = inDialog.getByRole("link", { name: "Choose seats" });
    await expect(chooseSeats).toHaveAttribute(
      "href",
      "/events/event-1/tickets/ticket-type-1?quantity=2",
    );
  },
};

// Generic failure copy.
export const GenericError: Story = {
  args: {
    startAction: fn(
      async (): Promise<StartCheckoutState> => ({ error: "GENERIC" }),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const inDialog = within(dialog(canvas));

    await userEvent.click(inDialog.getByRole("button", { name: "Start" }));

    await waitFor(() =>
      expect(
        inDialog.getByText("We couldn't start your checkout. Try again."),
      ).toBeVisible(),
    );
  },
};
