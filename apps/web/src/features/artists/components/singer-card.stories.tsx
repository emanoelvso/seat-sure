import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SingerCard } from "./singer-card";

const meta: Meta<typeof SingerCard> = {
  title: "Components/SingerCard",
  tags: ["autodocs"],
  component: SingerCard,
};

export default meta;

type Story = StoryObj<typeof SingerCard>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Adele")).toBeVisible();
    await expect(canvas.getByText("5 May, New York")).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Adele avatar" }),
    ).toBeVisible();
    // No href in the default story: the card is not a link.
    await expect(canvas.queryByRole("link")).toBeNull();
  },
} satisfies Story;
