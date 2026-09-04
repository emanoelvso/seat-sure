import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Input from "./Input";
import { EyeIcon, MagnifierIcon } from "@solar-icons/react/outline";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  tags: ["autodocs"],
  component: Input,
  argTypes: {
    leftIcon: {
      control: { type: "boolean" },
      mapping: { true: MagnifierIcon, false: undefined },
    },
    rightIcon: {
      control: { type: "boolean" },
      mapping: { true: EyeIcon, false: undefined },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {} satisfies Story;
