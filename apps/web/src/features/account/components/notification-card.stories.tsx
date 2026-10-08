import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { NotificationCard } from "./notification-card";

const SHORT_BODY = "Your payment for Rock Fest was not completed.";
const LONG_BODY =
  "We’re glad to have you here! 🎉\nExplore and book tickets for the best concerts, theaters, and events. To get started, complete your profile and add a payment method so checkout is quick and easy when you find the show you want.";

const meta: Meta<typeof NotificationCard> = {
  title: "Features/Account/NotificationCard",
  component: NotificationCard,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div className="w-[1048px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Welcome to ",
    titleHighlight: "SeatSure!",
    body: LONG_BODY,
    timestamp: "Yesterday at 4:42 PM",
    unread: true,
    onActivate: fn(),
  },
} satisfies Meta<typeof NotificationCard>;

export default meta;

type Story = StoryObj<typeof NotificationCard>;

function chevronOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>("[data-chevron]");
}

// Read AC 1-2: a long body is clamped with the chevron and
// aria-expanded="false"; activating opens it (chevron up), again closes it.
export const LongBodyExpands: Story = {
  play: async ({ canvas, canvasElement }) => {
    const card = await canvas.findByRole("button");
    await waitFor(() => expect(card).toHaveAttribute("aria-expanded", "false"));
    await expect(chevronOf(canvasElement)).not.toBeNull();
    await expect(getComputedStyle(chevronOf(canvasElement)!).rotate).not.toBe(
      "180deg",
    );

    await userEvent.click(card);
    await expect(card).toHaveAttribute("aria-expanded", "true");
    await expect(getComputedStyle(chevronOf(canvasElement)!).rotate).toBe(
      "180deg",
    );

    await userEvent.click(card);
    await expect(card).toHaveAttribute("aria-expanded", "false");
    await expect(getComputedStyle(chevronOf(canvasElement)!).rotate).not.toBe(
      "180deg",
    );
  },
};

// Read AC 2 + edge case: the open body shows in full and keeps its line
// breaks; the clamped body hides the lines past the second.
export const KeepsLineBreaksWhenOpen: Story = {
  play: async ({ canvas }) => {
    const card = await canvas.findByRole("button");
    const body = canvas.getByText(/We’re glad to have you here/);
    await waitFor(() => expect(card).toHaveAttribute("aria-expanded", "false"));
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);

    await userEvent.click(card);
    await expect(getComputedStyle(body).whiteSpace).toBe("pre-line");
    await expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
    await expect(body.textContent).toContain(
      "We’re glad to have you here! 🎉\nExplore and book tickets",
    );
  },
};

// Read AC 3: a body that fits in 2 lines has no chevron and no aria-expanded.
export const ShortBody: Story = {
  args: {
    title: "Your payment was unsuccessful ❌",
    titleHighlight: undefined,
    body: SHORT_BODY,
  },
  play: async ({ canvas, canvasElement }) => {
    const card = canvas.getByRole("button");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(card).not.toHaveAttribute("aria-expanded");
    await expect(chevronOf(canvasElement)).toBeNull();
  },
};

// Read AC 4 (card side): an unread card shows the dot with "Unread" and each
// click calls onActivate.
export const UnreadActivates: Story = {
  args: { body: SHORT_BODY },
  play: async ({ canvas, canvasElement, args }) => {
    const card = canvas.getByRole("button");
    await expect(canvas.getByText("Unread")).toBeInTheDocument();
    await expect(canvasElement.querySelector(".bg-primary")).not.toBeNull();

    await userEvent.click(card);
    await expect(args.onActivate).toHaveBeenCalledTimes(1);
    await userEvent.click(card);
    await expect(args.onActivate).toHaveBeenCalledTimes(2);
  },
};

// Read AC 12 (View): a read card shows neither the dot nor "Unread".
export const Read: Story = {
  args: { unread: false, body: SHORT_BODY },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByText("Unread")).toBeNull();
    await expect(canvasElement.querySelector(".bg-primary")).toBeNull();
  },
};

// View AC 11, 14: the title with its primary highlight, the body and the
// timestamp.
export const ShowsTitleBodyAndTimestamp: Story = {
  play: async ({ canvas }) => {
    const highlight = canvas.getByText("SeatSure!");
    await expect(highlight).toHaveClass("text-primary");
    await expect(canvas.getByRole("button")).toHaveTextContent(
      "Welcome to SeatSure!",
    );
    await expect(canvas.getByText("Yesterday at 4:42 PM")).toBeVisible();
  },
};

// Read AC 10: native browser pointer movement activates the CSS :hover
// state. Check the rendered gradient stops from the approved card metadata.
export const HoverShowsGradient: Story = {
  args: { body: SHORT_BODY },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("button");
    await expect(getComputedStyle(card).backgroundImage).toBe("none");
    await expect(card.className).toContain("hover:bg-[linear-gradient(90deg,");
    const { page } = await import("vitest/browser");
    const pointer = page.elementLocator(card);
    await pointer.hover();
    await waitFor(() =>
      expect(getComputedStyle(card).backgroundImage).toBe(
        "linear-gradient(90deg, rgba(193, 79, 230, 0.15), rgba(27, 27, 27, 0))",
      ),
    );
    await pointer.unhover();
    await expect(getComputedStyle(card).backgroundImage).toBe("none");
  },
};
