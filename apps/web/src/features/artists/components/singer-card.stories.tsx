import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SingerCard } from "./singer-card";

const meta: Meta<typeof SingerCard> = {
  title: "Components/SingerCard",
  tags: ["autodocs"],
  component: SingerCard,
};

export default meta;

type Story = StoryObj<typeof SingerCard>;

export const Default: Story = {} satisfies Story;
