import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { FanProtectCard } from "./fan-protect-card";

const meta: Meta<typeof FanProtectCard> = {
  title: "Features/Checkout/FanProtectCard",
  tags: ["autodocs"],
  component: FanProtectCard,
} satisfies Meta<typeof FanProtectCard>;

export default meta;

type Story = StoryObj<typeof FanProtectCard>;

// PAY-20: the box's three exact strings.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("FanProtect : every order is 100% guaranteed"),
    ).toBeVisible();
    await expect(canvas.getByText("Easy Refund")).toBeVisible();
    await expect(
      canvas.getByText(
        "Change of plans? Get your money back up to 24 hours before the event.",
      ),
    ).toBeVisible();
  },
};
