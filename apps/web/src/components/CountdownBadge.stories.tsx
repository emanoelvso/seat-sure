import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { renderToString } from "react-dom/server";
import { expect } from "storybook/test";
import CountdownBadge from "./CountdownBadge";

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3600 * 1000).toISOString();

const meta: Meta<typeof CountdownBadge> = {
  title: "Components/CountdownBadge",
  component: CountdownBadge,
  args: { eventDate: hoursFromNow(2) },
} satisfies Meta<typeof CountdownBadge>;

export default meta;

type Story = StoryObj<typeof CountdownBadge>;

export const StartsSoon: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Time to start")).toBeVisible();
    await expect(canvas.getByText(/^1h 59m \d{1,2}s$/)).toBeVisible();
  },
};

export const MoreThanADayAway: Story = {
  args: { eventDate: hoursFromNow(48) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Time to start")).toBeNull();
  },
};

export const AlreadyStarted: Story = {
  args: { eventDate: hoursFromNow(-1) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Starting now")).toBeVisible();
  },
};

// MIG-35: the server HTML is empty, so the ticking seconds can't mismatch
// the first client render during hydration.
export const RendersNothingOnTheServer: Story = {
  play: async ({ args }) => {
    await expect(renderToString(<CountdownBadge {...args} />)).toBe("");
  },
};
