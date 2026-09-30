import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Footer } from "./footer";

const meta: Meta<typeof Footer> = {
  title: "Components/Footer",
  tags: ["autodocs"],
  component: Footer,
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof Footer>;

export const Default: Story = {} satisfies Story;
