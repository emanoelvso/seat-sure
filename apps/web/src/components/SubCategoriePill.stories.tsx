import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SubCategoriePill from "./SubCategoriePill";

const meta: Meta<typeof SubCategoriePill> = {
  title: "Components/SubCategoriePill",
  component: SubCategoriePill,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "active"],
    },
    children: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof SubCategoriePill>;

export default meta;

type Story = StoryObj<typeof SubCategoriePill>;

export const Default: Story = {
  render: (args) => (
    <SubCategoriePill {...args}>Eletronic & Dance</SubCategoriePill>
  ),
} satisfies Story;
