import { Meta, StoryObj } from "@storybook/nextjs-vite";
import MainCard from "./MainCard";

const meta: Meta<typeof MainCard> = {
  title: "Components/MainCard",
  component: MainCard,
  tags: ["autodocs"],
  argTypes: {
    avatarUrl: {
      table: { disable: true },
      control: { type: "boolean" },
      mapping: {
        true: "https://sb.kaleidousercontent.com/67418/1920x1545/c5f15ac173/samuel-raita-ridxdghg7pw-unsplash.jpg",
        false: undefined,
      },
    },
    timeToEnd: {
      control: "boolean",
      mapping: {
        true: "06:34:15",
        false: undefined,
      },
    },
  },
} satisfies Meta<typeof MainCard>;

export default meta;

type Story = StoryObj<typeof MainCard>;

export const Default: Story = {};
