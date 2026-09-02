import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRightIcon } from "@solar-icons/react/outline";
import Button from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  args: {
    variant: "primary",
    text: "Button",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["primary", "outline", "ghost"],
      control: { type: "select" },
      defaultValue: "primary",
    },
    size: {
      options: ["sm", "md", "lg", "xl", "icon"],
      control: { type: "select" },
      defaultValue: "md",
    },
    iconSize: {
      options: [16, 24],
      control: { type: "select" },
      defaultValue: 16,
    },
    leftIcon: {
      control: { type: "boolean" },
      mapping: { true: ArrowRightIcon, false: undefined },
    },
    rightIcon: {
      control: { type: "boolean" },
      mapping: { true: ArrowRightIcon, false: undefined },
    },
    disabled: {
      control: { type: "boolean" },
      mapping: { true: true, false: false },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    variant: "primary",
    text: "Button",
    disabled: true,
  },
} satisfies Story;
