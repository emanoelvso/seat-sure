import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { vi } from "vitest";
import { CountdownTimer } from "./countdown-timer";

const meta: Meta<typeof CountdownTimer> = {
  title: "Features/Checkout/CountdownTimer",
  tags: ["autodocs"],
  component: CountdownTimer,
} satisfies Meta<typeof CountdownTimer>;

export default meta;

type Story = StoryObj<typeof CountdownTimer>;

// Fake timers advance the component's setInterval callback, but React's
// scheduler flushes the resulting state update through a real
// MessageChannel task in the browser - a real animation frame lets that
// settle before the DOM is read.
function flushReact() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function digitBoxText(canvasElement: HTMLElement) {
  return Array.from(
    canvasElement.querySelectorAll("[data-countdown-digit='true']"),
  ).map((el) => el.textContent);
}

// Timers must be faked before the component mounts, so its effect schedules
// a fake setInterval instead of a real one - a decorator runs during render,
// ahead of play() and ahead of the mount effect.
// requestAnimationFrame is left real (see flushReact) so the browser's own
// scheduler can still flush React's state update onto the DOM.
const withFakeTimers: Story["decorators"] = [
  (StoryFn) => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    return StoryFn();
  },
];

// PAY-19: 583 s renders "09:43" as four digit boxes, then ticks down by one
// second after 1 s elapsed.
export const Ticking: Story = {
  args: { secondsLeft: 583, running: true },
  decorators: withFakeTimers,
  play: async ({ canvasElement }) => {
    try {
      await flushReact();
      await expect(digitBoxText(canvasElement)).toEqual(["0", "9", "4", "3"]);

      await vi.advanceTimersByTimeAsync(1000);
      await flushReact();

      await expect(digitBoxText(canvasElement)).toEqual(["0", "9", "4", "2"]);
    } finally {
      vi.useRealTimers();
    }
  },
};

// PAY-58: onExpire fires exactly once at 0, not again after more ticks.
export const Expiring: Story = {
  args: { secondsLeft: 2, running: true, onExpire: fn() },
  decorators: withFakeTimers,
  play: async ({ args }) => {
    try {
      await vi.advanceTimersByTimeAsync(2000);
      await expect(args.onExpire).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3000);
      await expect(args.onExpire).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  },
};

// PAY-19: running=false freezes the countdown.
export const Paused: Story = {
  args: { secondsLeft: 600, running: false },
  decorators: withFakeTimers,
  play: async ({ canvasElement }) => {
    try {
      await flushReact();
      await expect(digitBoxText(canvasElement)).toEqual(["1", "0", "0", "0"]);

      await vi.advanceTimersByTimeAsync(5000);
      await flushReact();

      await expect(digitBoxText(canvasElement)).toEqual(["1", "0", "0", "0"]);
    } finally {
      vi.useRealTimers();
    }
  },
};

// PAY-19: the countdown's exact copy.
export const Copy: Story = {
  args: { secondsLeft: 60, running: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("left to complete your purchase"),
    ).toBeVisible();
    await expect(
      canvas.getByText("Your price is only guaranteed for this time!"),
    ).toBeVisible();
  },
};
