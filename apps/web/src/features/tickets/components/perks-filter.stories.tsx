import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, screen } from "storybook/test";
import type { SeatPerk } from "@/types/__generated__/graphql";
import { PerksFilter } from "./perks-filter";

const meta: Meta<typeof PerksFilter> = {
  title: "Features/Tickets/PerksFilter",
  component: PerksFilter,
  args: {
    value: [],
    onChange: fn(),
  },
} satisfies Meta<typeof PerksFilter>;

export default meta;

type Story = StoryObj<typeof PerksFilter>;

export const ListsThreePerks: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Perks" }));

    const options = await screen.findAllByRole("checkbox");

    await expect(
      options.map((option) => option.nextSibling?.textContent),
    ).toEqual(["Aisle", "Extra legroom", "Accessible"]);
    for (const option of options) {
      await expect(option).not.toBeChecked();
    }
  },
};

// The page owns the selection, so the story keeps it in state.
export const EmitsSelectedPerks: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<SeatPerk[]>([]);

    return (
      <PerksFilter
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Perks" }));

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Aisle" }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(["AISLE"]);

    await userEvent.click(screen.getByRole("checkbox", { name: "Accessible" }));
    await expect(args.onChange).toHaveBeenLastCalledWith([
      "AISLE",
      "ACCESSIBLE",
    ]);

    await userEvent.click(screen.getByRole("checkbox", { name: "Aisle" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(["ACCESSIBLE"]);
  },
};

export const PresetValueIsChecked: Story = {
  args: { value: ["EXTRA_LEGROOM"] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Perks" }));

    await expect(
      await screen.findByRole("checkbox", { name: "Extra legroom" }),
    ).toBeChecked();
    await expect(
      screen.getByRole("checkbox", { name: "Aisle" }),
    ).not.toBeChecked();
    await expect(
      screen.getByRole("checkbox", { name: "Accessible" }),
    ).not.toBeChecked();
  },
};
