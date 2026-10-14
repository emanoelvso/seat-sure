import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { FrontRowsToggle } from "./front-rows-toggle";

const meta: Meta<typeof FrontRowsToggle> = {
  title: "Features/Tickets/FrontRowsToggle",
  component: FrontRowsToggle,
  args: {
    pressed: false,
    onPressedChange: fn(),
  },
} satisfies Meta<typeof FrontRowsToggle>;

export default meta;

type Story = StoryObj<typeof FrontRowsToggle>;

export const OffByDefault: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Front rows" }),
    ).toHaveAttribute("aria-pressed", "false");
  },
};

export const ClickTurnsOn: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Front rows" }));

    await expect(args.onPressedChange).toHaveBeenCalledTimes(1);
    await expect(args.onPressedChange).toHaveBeenCalledWith(true);
  },
};

export const Pressed: Story = {
  args: { pressed: true },
  play: async ({ canvas, args, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Front rows" });

    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(toggle);
    await expect(args.onPressedChange).toHaveBeenCalledWith(false);
  },
};
