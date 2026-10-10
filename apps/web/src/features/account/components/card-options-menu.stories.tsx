import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import { CardOptionsMenu } from "./card-options-menu";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof CardOptionsMenu> = {
  title: "Features/Account/CardOptionsMenu",
  component: CardOptionsMenu,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    brand: "visa",
    last4: "4242",
    isDefault: false,
    onSetDefault: fn(),
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardOptionsMenu>;

export default meta;

type Story = StoryObj<typeof CardOptionsMenu>;

const triggerName = "Card options for Visa ending in 4242";

// Radix aria-hides the rest of the page while a menu is open (trigger
// included), which the a11y scan after play() would report; close it first.
async function closeMenu(
  userEvent: Parameters<NonNullable<Story["play"]>>[0]["userEvent"],
) {
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
}

// CARD-10 AC 1-2: the trigger is named after the card; a non-default card
// lists "Set as default" then "Remove".
export const NonDefault: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await screen.findByRole("menu");

    const items = screen.getAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Set as default",
      "Remove",
    ]);
    await closeMenu(userEvent);
  },
};

// CARD-10 AC 3: the default card lists "Remove" only.
export const Default: Story = {
  args: { isDefault: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await screen.findByRole("menu");

    const items = screen.getAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual(["Remove"]);
    await closeMenu(userEvent);
  },
};

// The label follows the brand and last 4.
export const MastercardTrigger: Story = {
  args: { brand: "mastercard", last4: "4444" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", {
        name: "Card options for Mastercard ending in 4444",
      }),
    ).toBeVisible();
  },
};

// CARD-10 AC 4: selecting "Set as default" calls onSetDefault only.
export const SelectSetDefault: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Set as default" }),
    );

    await expect(args.onSetDefault).toHaveBeenCalledTimes(1);
    await expect(args.onRemove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};

// CARD-10 AC 5: selecting "Remove" calls onRemove only.
export const SelectRemove: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: triggerName }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remove" }),
    );

    await expect(args.onRemove).toHaveBeenCalledTimes(1);
    await expect(args.onSetDefault).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};

// Keyboard: Enter on the focused trigger opens the menu, Escape closes it
// and returns focus to the trigger.
export const KeyboardOpenAndClose: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: triggerName });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await screen.findByRole("menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};
