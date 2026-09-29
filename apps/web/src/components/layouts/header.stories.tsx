import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "Components/Header",
  tags: ["autodocs"],
  component: Header,
  argTypes: {
    avatarUrl: {
      control: { type: "boolean" },
      mapping: {
        true: "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
        false: undefined,
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {} satisfies Story;
