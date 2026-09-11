import { Meta, StoryObj } from "@storybook/nextjs-vite";
import StatusPill from "./StatusPill";

const meta: Meta<typeof StatusPill> = {
  title: "Components/StatusPill",
  component: StatusPill,
  tags: ["autodocs"],
  args: {
    variant: "pending",
    size: "sm",
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["pending", "success", "error", "info"],
    },
    size: {
      control: { type: "radio" },
      options: ["xs", "sm"],
    },
    children: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof StatusPill>;

export default meta;

type Story = StoryObj<typeof StatusPill>;

export const Default: Story = {
  render: (args) => <StatusPill {...args}>Pending</StatusPill>,
} satisfies Story;
