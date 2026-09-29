import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen } from "storybook/test";
import { PillSelect } from "./pill-select";

const options = [
  { value: "1", label: "1 ticket" },
  { value: "2", label: "2 tickets" },
  { value: "3", label: "3 tickets" },
  { value: "4", label: "4 tickets" },
];

const meta: Meta<typeof PillSelect> = {
  title: "Components/PillSelect",
  component: PillSelect,
  args: {
    label: "Tickets",
    value: "2",
    options,
    onChange: fn(),
    variant: "active",
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "active"],
    },
  },
} satisfies Meta<typeof PillSelect>;

export default meta;

type Story = StoryObj<typeof PillSelect>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const trigger = canvas.getByRole("combobox", { name: "Tickets" });
    await expect(trigger).toHaveTextContent("2 tickets");

    await userEvent.click(trigger);

    const listed = await screen.findAllByRole("option");
    await expect(listed.map((option) => option.textContent)).toEqual([
      "1 ticket",
      "2 tickets",
      "3 tickets",
      "4 tickets",
    ]);

    await userEvent.click(screen.getByRole("option", { name: "4 tickets" }));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith("4");
  },
};
