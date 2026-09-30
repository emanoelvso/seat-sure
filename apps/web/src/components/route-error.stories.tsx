import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { RouteError } from "./route-error";

const meta: Meta<typeof RouteError> = {
  title: "Components/RouteError",
  component: RouteError,
  args: {
    message: "We couldn't load this artist.",
    onRetry: fn(),
  },
} satisfies Meta<typeof RouteError>;

export default meta;

type Story = StoryObj<typeof RouteError>;

export const ArtistError: Story = {
  args: { message: "We couldn't load this artist." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "We couldn't load this artist.",
    );
    await expect(canvas.getByRole("banner")).toBeVisible();
  },
};

export const TicketsError: Story = {
  args: { message: "We couldn't load tickets for this event." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "We couldn't load tickets for this event.",
    );
    await expect(canvas.getByRole("banner")).toBeVisible();
  },
};

export const EventsError: Story = {
  args: { message: "We couldn't load events." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "We couldn't load events.",
    );
    await expect(canvas.getByRole("banner")).toBeVisible();
  },
};

export const Retry: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));

    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
