import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CardPreview } from "./card-preview";

const meta: Meta<typeof CardPreview> = {
  title: "Components/CardPreview",
  tags: ["autodocs"],
  component: CardPreview,
  args: { number: "", holder: "", expiry: "" },
} satisfies Meta<typeof CardPreview>;

export default meta;

type Story = StoryObj<typeof CardPreview>;

// PAY-32: an empty form shows the placeholders and the generic brand.
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Credit Card")).toBeVisible();
    await expect(canvas.getByText("•••• •••• •••• ••••")).toBeVisible();
    await expect(canvas.getByText("CardHolder Name")).toBeVisible();
    await expect(canvas.getByText("Cardholder Name")).toBeVisible();
    await expect(canvas.getByText("Expiry date")).toBeVisible();
    await expect(canvas.getByText("MM / YY")).toBeVisible();
    await expect(canvas.getByText("Card")).toBeVisible();
  },
};

// PAY-32: a Visa number shows its brand, the last 4, the holder and the
// expiry as "MM / YY". Only the "Card ending in" summary is exposed to
// assistive technology.
export const Visa: Story = {
  args: {
    number: "4242 4242 4242 4242",
    holder: "Negar Khosravi",
    expiry: "08/30",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Visa")).toBeVisible();
    await expect(canvas.getByText("•••• •••• •••• 4242")).toBeVisible();
    await expect(canvas.getByText("Negar Khosravi")).toBeVisible();
    await expect(canvas.getByText("08 / 30")).toBeVisible();
    await expect(canvas.queryByText("Cardholder Name")).toBeNull();
    await expect(canvas.queryByText("MM / YY")).toBeNull();

    const visual = canvas.getByText("Visa").closest("[aria-hidden='true']");
    await expect(visual).not.toBeNull();
    await expect(
      canvas.getByText("Card ending in 4242").closest("[aria-hidden='true']"),
    ).toBeNull();
  },
};

// PAY-32: an American Express number shows its brand and its own last 4.
export const Amex: Story = {
  args: { number: "3782 822463 10005", holder: "", expiry: "" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("American Express")).toBeVisible();
    await expect(canvas.getByText("•••• •••• •••• 0005")).toBeVisible();
    await expect(canvas.getByText("Card ending in 0005")).toBeInTheDocument();
  },
};

// CARD-01 AC 4: a saved Visa card shows the Visa logo, its last 4, the
// holder and the expiry as "MM / YY", from its brand and last 4 alone.
export const SavedVisa: Story = {
  args: {
    brand: "visa",
    last4: "8557",
    holder: "Negar Khosravi",
    expiry: "08/25",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Credit Card")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Visa", hidden: true }),
    ).toBeVisible();
    await expect(canvas.getByText("•••• •••• •••• 8557")).toBeVisible();
    await expect(canvas.getByText("Negar Khosravi")).toBeVisible();
    await expect(canvas.getByText("08 / 25")).toBeVisible();
    await expect(canvas.getByText("Card ending in 8557")).toBeInTheDocument();
  },
};

// CARD-01 AC 4: a saved card of another brand shows the brand's name.
export const SavedMastercard: Story = {
  args: {
    brand: "mastercard",
    last4: "4444",
    holder: "Ada Lovelace",
    expiry: "01/31",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mastercard")).toBeVisible();
    await expect(
      canvas.queryByRole("img", { name: "Visa", hidden: true }),
    ).toBeNull();
    await expect(canvas.getByText("•••• •••• •••• 4444")).toBeVisible();
    await expect(canvas.getByText("Ada Lovelace")).toBeVisible();
    await expect(canvas.getByText("01 / 31")).toBeVisible();
  },
};

// The children slot renders inside the card frame, outside the decorative
// visual, so a badge or a menu button stays accessible.
export const WithChildren: Story = {
  args: {
    brand: "visa",
    last4: "4242",
    holder: "Ada Lovelace",
    expiry: "08/30",
    children: (
      <button type="button" className="absolute top-4 right-4">
        Card options
      </button>
    ),
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Card options" });
    await expect(button).toBeVisible();
    await expect(button.closest("[aria-hidden='true']")).toBeNull();
    await expect(
      button.parentElement?.contains(canvas.getByText("Credit Card")),
    ).toBe(true);
  },
};
