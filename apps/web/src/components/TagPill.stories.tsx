import { Meta, StoryObj } from "@storybook/nextjs-vite";
import TagPill from "./TagPill";

const meta: Meta<typeof TagPill> = {
  title: "Components/TagPill",
  component: TagPill,
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
} satisfies Meta<typeof TagPill>;

export default meta;

type Story = StoryObj<typeof TagPill>;

export const Default: Story = {
  render: (args) => <TagPill {...args}>Pending</TagPill>,
} satisfies Story;
