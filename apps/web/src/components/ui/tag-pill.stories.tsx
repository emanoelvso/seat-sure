import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TagPill } from "./tag-pill";

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
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pending")).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
} satisfies Story;
