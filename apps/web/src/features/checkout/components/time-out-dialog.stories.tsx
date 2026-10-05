import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TimeOutDialog } from "./time-out-dialog";

const meta: Meta<typeof TimeOutDialog> = {
  title: "Features/Checkout/TimeOutDialog",
  tags: ["autodocs"],
  component: TimeOutDialog,
  args: {
    open: true,
    seatsHref: "/events/event-1/tickets/ticket-type-1?quantity=2",
  },
} satisfies Meta<typeof TimeOutDialog>;

export default meta;

type Story = StoryObj<typeof TimeOutDialog>;

// PAY-58: the exact copy and the "Choose seats" link's href. PAY-59: Escape
// doesn't dismiss the dialog.
export const OpenAndNotDismissable: Story = {
  play: async ({ canvas, userEvent }) => {
    const modal = canvas.getByRole("dialog", { name: "Your time ran out" }) as HTMLDialogElement;
    await expect(modal.open).toBe(true);

    await expect(
      canvas.getByText("Your seats were released. Pick your seats again."),
    ).toBeVisible();

    const chooseSeats = canvas.getByRole("link", { name: "Choose seats" });
    await expect(chooseSeats).toHaveAttribute(
      "href",
      "/events/event-1/tickets/ticket-type-1?quantity=2",
    );

    await userEvent.keyboard("{Escape}");

    await expect(modal.open).toBe(true);
  },
};

// PAY-59: the open modal makes the rest of the page inert, so a background
// "Confirm"/"Review order"/"Pay" button can't be reached.
export const PageIsInert: Story = {
  render: (args) => (
    <div>
      <button type="button">Confirm</button>
      <TimeOutDialog {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const background = canvas.getByRole("button", { name: "Confirm" });

    background.focus();

    await expect(document.activeElement).not.toBe(background);
  },
};

// `open={false}` renders no dialog at all.
export const Closed: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};
