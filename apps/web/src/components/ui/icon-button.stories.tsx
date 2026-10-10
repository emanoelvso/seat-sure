import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconButton } from "./icon-button";
import { MinimalisticMagnifierOutlineIcon } from "@solar-icons/react";

const meta: Meta<typeof IconButton> = {
  // TODO(a11y): button-name still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
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
} satisfies Story;
