import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import EventTicketsError from "./error";

const meta = {
  title: "Pages/EventTicketsError",
  component: EventTicketsError,
  args: {
    error: new Error("findUnavailableSeats failed"),
    unstable_retry: fn(),
  },
} satisfies Meta<typeof EventTicketsError>;

export default meta;

type Story = StoryObj<typeof meta>;

// SEAT-33: a failing seat page query lands on this boundary.
export const LoadFailed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const alert = canvas.getByRole("alert");

    await expect(
      within(alert).getByText("We couldn't load tickets for this event."),
    ).toBeVisible();

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    await expect(args.unstable_retry).toHaveBeenCalledTimes(1);
  },
};
