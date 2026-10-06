import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { BrandLogo } from "./brand-logo";

const meta: Meta<typeof BrandLogo> = {
  title: "Components/BrandLogo",
  component: BrandLogo,
  tags: ["autodocs"],
} satisfies Meta<typeof BrandLogo>;

export default meta;

type Story = StoryObj<typeof BrandLogo>;

// ACCT-01: the SeatSure logo links home.
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "SeatSure" }),
    ).toHaveAttribute("href", "/");
  },
};
