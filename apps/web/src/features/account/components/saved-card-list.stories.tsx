import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import type { PaymentCard } from "@/features/account/api/find-my-payment-cards";
import { SavedCardList } from "./saved-card-list";

function makeCard(
  last4: string,
  overrides: Partial<PaymentCard> = {},
): PaymentCard {
  return {
    __typename: "PaymentCard",
    id: `card-${last4}`,
    brand: "visa",
    last4,
    expMonth: 8,
    expYear: 2030,
    holder: "Negar Khosravi",
    isDefault: false,
    expired: false,
    ...overrides,
  };
}

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof SavedCardList> = {
  title: "Features/Account/SavedCardList",
  component: SavedCardList,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    cards: [
      makeCard("8557", { isDefault: true }),
      makeCard("4444", { brand: "mastercard", holder: "Ada Lovelace" }),
    ],
    onAdd: fn(),
    onSetDefault: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof SavedCardList>;

export default meta;

type Story = StoryObj<typeof SavedCardList>;

// CARD-01 AC 3: one visual per card, in the order given (default first).
export const TwoCards: Story = {
  play: async ({ canvas }) => {
    const items = within(
      canvas.getByRole("list", { name: "Saved cards" }),
    ).getAllByRole("listitem");
    await expect(items).toHaveLength(2);
    await expect(
      within(items[0]).getByText("•••• •••• •••• 8557"),
    ).toBeVisible();
    await expect(within(items[0]).getByText("Default")).toBeVisible();
    await expect(
      within(items[1]).getByText("•••• •••• •••• 4444"),
    ).toBeVisible();
    await expect(within(items[1]).queryByText("Default")).toBeNull();
  },
};

// CARD-01 AC 3: the list keeps the prop order, whatever the cards are.
export const KeepsPropOrder: Story = {
  args: {
    cards: [makeCard("0005"), makeCard("1111"), makeCard("9999")],
  },
  play: async ({ canvas }) => {
    const triggers = canvas.getAllByRole("button", { name: /Card options/ });
    await expect(triggers.map((t) => t.getAttribute("aria-label"))).toEqual([
      "Card options for Visa ending in 0005",
      "Card options for Visa ending in 1111",
      "Card options for Visa ending in 9999",
    ]);
  },
};

// CARD-03 AC 15 entry point: the tile reads "Add payment method" and calls
// onAdd.
export const AddTile: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const tile = canvas.getByRole("button", { name: "Add payment method" });
    await expect(tile).toBeEnabled();
    await userEvent.click(tile);
    await expect(args.onAdd).toHaveBeenCalledTimes(1);
  },
};

// No cards: only the tile.
export const NoCards: Story = {
  args: { cards: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("list")).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Add payment method" }),
    ).toBeEnabled();
  },
};

// CARD-04 AC 11: at 5 cards the tile reads "You can save up to 5 cards.",
// is disabled, and does nothing.
export const AtLimit: Story = {
  args: {
    cards: ["0001", "0002", "0003", "0004", "0005"].map((last4, index) =>
      makeCard(last4, { isDefault: index === 0 }),
    ),
  },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(5);
    await expect(
      canvas.queryByRole("button", { name: "Add payment method" }),
    ).toBeNull();
    const tile = canvas.getByRole("button", {
      name: "You can save up to 5 cards.",
    });
    await expect(tile).toBeDisabled();
    await userEvent.click(tile);
    await expect(args.onAdd).not.toHaveBeenCalled();
  },
};

// Four cards: still below the limit.
export const BelowLimit: Story = {
  args: {
    cards: ["0001", "0002", "0003", "0004"].map((last4) => makeCard(last4)),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Add payment method" }),
    ).toBeEnabled();
  },
};

// Menu actions reach the list's callbacks with the card's id.
export const SetDefaultFromList: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Card options for Mastercard ending in 4444",
      }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Set as default" }),
    );
    await expect(args.onSetDefault).toHaveBeenCalledWith("card-4444");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};
