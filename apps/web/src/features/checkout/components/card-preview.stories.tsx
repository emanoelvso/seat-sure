import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CardPreview } from "./card-preview";

const meta: Meta<typeof CardPreview> = {
  title: "Features/Checkout/CardPreview",
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
