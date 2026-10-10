import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { CheckoutPaymentCard } from "@/features/checkout/api/find-checkout-payment-cards";
import { SavedCardPicker } from "./saved-card-picker";

function makeCard(
  last4: string,
  overrides: Partial<CheckoutPaymentCard> = {},
): CheckoutPaymentCard {
  return {
    __typename: "PaymentCard",
    id: `card-${last4}`,
    brand: "visa",
    last4,
    expMonth: 8,
    expYear: 2030,
    holder: "Nadia Kahn",
    isDefault: false,
    expired: false,
    ...overrides,
  };
}

const DEFAULT_VISA = makeCard("4242", { isDefault: true });
const MASTERCARD = makeCard("4444", {
  brand: "mastercard",
  expMonth: 1,
  expYear: 2031,
});

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof SavedCardPicker> = {
  title: "Features/Checkout/SavedCardPicker",
  component: SavedCardPicker,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  args: {
    cards: [DEFAULT_VISA, MASTERCARD],
    onConfirm: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SavedCardPicker>;

export default meta;

type Story = StoryObj<typeof SavedCardPicker>;

// CARD-07 AC 1: the heading, one row per card in prop order with
// "Expires MM/YY", then "New card", then "Confirm".
export const Rows: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Select payment method" }),
    ).toBeVisible();
    const group = canvas.getByRole("radiogroup", {
      name: "Select payment method",
    });
    await expect(group).toBeVisible();

    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(3);
    await expect(radios[0]).toHaveAccessibleName("Visa •••• 4242");
    await expect(radios[0]).toHaveAccessibleDescription("Expires 08/30");
    await expect(radios[1]).toHaveAccessibleName("Mastercard •••• 4444");
    await expect(radios[1]).toHaveAccessibleDescription("Expires 01/31");
    await expect(radios[2]).toHaveAccessibleName("New card");
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeVisible();
  },
};

// CARD-07 AC 2: the default card is preselected; Confirm sends its id.
export const DefaultPreselected: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(
      canvas.getByRole("radio", { name: "Visa •••• 4242" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("radio", { name: "Mastercard •••• 4444" }),
    ).not.toBeChecked();

    const confirm = canvas.getByRole("button", { name: "Confirm" });
    await expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledWith("card-4242");
  },
};

// CARD-07 AC 2-4: an expired default is not preselected, its row is
// disabled with "Expired", and Confirm stays disabled until a row is picked.
export const ExpiredDefault: Story = {
  args: {
    cards: [
      makeCard("4242", {
        isDefault: true,
        expMonth: 1,
        expYear: 2024,
        expired: true,
      }),
      MASTERCARD,
    ],
  },
  play: async ({ canvas, userEvent, args }) => {
    const expired = canvas.getByRole("radio", { name: "Visa •••• 4242" });
    await expect(expired).toBeDisabled();
    await expect(expired).not.toBeChecked();
    await expect(expired).toHaveTextContent("Expired");
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio).not.toBeChecked();
    }

    const confirm = canvas.getByRole("button", { name: "Confirm" });
    await expect(confirm).toBeDisabled();

    await userEvent.click(
      canvas.getByRole("radio", { name: "Mastercard •••• 4444" }),
    );
    await expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).toHaveBeenCalledWith("card-4444");
  },
};

// CARD-07 AC 4: no default card → nothing selected and Confirm disabled.
export const NoSelection: Story = {
  args: { cards: [makeCard("4444", { brand: "mastercard" })] },
  play: async ({ canvas, args }) => {
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio).not.toBeChecked();
    }
    await expect(
      canvas.getByRole("button", { name: "Confirm" }),
    ).toBeDisabled();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

// CARD-07 AC 6 entry: choosing "New card" confirms "new".
export const ConfirmNewCard: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "New card" }));
    await expect(canvas.getByRole("radio", { name: "New card" })).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(args.onConfirm).toHaveBeenCalledWith("new");
  },
};

// The optional error renders in an alert.
export const WithError: Story = {
  args: {
    error: "This card is no longer available. Choose another payment method.",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "This card is no longer available. Choose another payment method.",
    );
  },
};

// No error → no alert.
export const WithoutError: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};
