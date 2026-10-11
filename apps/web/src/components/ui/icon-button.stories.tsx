import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { IconButton } from "./icon-button";
import { MinimalisticMagnifierOutlineIcon } from "@solar-icons/react";

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  tags: ["autodocs"],
  component: IconButton,
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: {
    icon: MinimalisticMagnifierOutlineIcon,
  },
  // IconButton has no onClick, disabled or accessible-name prop, so the
  // observable outcome is one enabled button that renders its icon.
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button");
    await expect(button).toBeEnabled();
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
  },
} satisfies Story;
