import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SubCategoriePill } from "./sub-categorie-pill";

type Canvas = ReturnType<typeof within>;

const closeIcons = (canvas: Canvas) =>
  within(
    canvas.getByRole("button", { name: "Eletronic & Dance" }),
  ).queryAllByTestId("close-icon");

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
  play: async ({ canvas }) => {
    await expect(closeIcons(canvas)).toHaveLength(0);
  },
} satisfies Story;

export const Removable: Story = {
  args: { removable: true },
  render: (args) => (
    <SubCategoriePill {...args}>Eletronic & Dance</SubCategoriePill>
  ),
  play: async ({ canvas }) => {
    await expect(closeIcons(canvas)).toHaveLength(1);
  },
} satisfies Story;
