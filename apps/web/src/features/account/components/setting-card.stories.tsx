import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { useState } from "react";
import { SettingCard } from "./setting-card";

const changed = fn();
const meta = {
  title: "Features/Account/SettingCard",
  component: SettingCard,
  parameters: { a11y: { test: "error" } },
  args: {
    title: "Event Reminders",
    description: "Get notified before your event starts, so you never miss it!",
    checked: false,
    onCheckedChange: changed,
  },
  beforeEach: () => changed.mockClear(),
  render: function Controlled(args) {
    const [checked, setChecked] = useState(args.checked);
    return (
      <SettingCard
        {...args}
        checked={checked}
        onCheckedChange={(value) => {
          setChecked(value);
          args.onCheckedChange(value);
        }}
      />
    );
  },
} satisfies Meta<typeof SettingCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    await expect(control).not.toBeChecked();
    await expect(control).toHaveAccessibleDescription(
      "Get notified before your event starts, so you never miss it!",
    );
    await userEvent.click(control);
    await expect(control).toBeChecked();
    await expect(changed).toHaveBeenLastCalledWith(true);
    await userEvent.click(control);
    await expect(control).not.toBeChecked();
    await expect(changed).toHaveBeenLastCalledWith(false);
  },
};
export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    control.focus();
    await userEvent.keyboard(" ");
    await expect(control).toBeChecked();
    await userEvent.keyboard(" ");
    await expect(control).not.toBeChecked();
  },
};
export const Checked: Story = {
  args: { checked: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("switch", { name: "Event Reminders" }),
    ).toBeChecked();
  },
};
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent }) => {
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    await expect(control).toBeDisabled();
    await userEvent.click(control);
    await expect(control).not.toBeChecked();
    await expect(changed).not.toHaveBeenCalled();
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const control = canvas.getByRole("switch", { name: "Event Reminders" });
    const card = control.parentElement!;
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    await expect(control.getBoundingClientRect().width).toBe(50);
    await expect(control.getBoundingClientRect().height).toBe(28);
  },
};
