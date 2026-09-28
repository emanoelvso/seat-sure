import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen } from "storybook/test";
import SortSelect from "./SortSelect";

const meta: Meta<typeof SortSelect> = {
  title: "Components/SortSelect",
  component: SortSelect,
  args: {
    value: "desc",
    onChange: fn(),
  },
} satisfies Meta<typeof SortSelect>;

export default meta;

type Story = StoryObj<typeof SortSelect>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const trigger = canvas.getByRole("combobox", { name: "Sort by" });
    await expect(trigger).toHaveTextContent("Price: high to low");

    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("option", { name: "Price: low to high" }),
    );

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith("asc");
  },
};
