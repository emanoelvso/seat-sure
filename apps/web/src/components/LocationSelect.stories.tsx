import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen } from "storybook/test";
import LocationSelect from "./LocationSelect";

const meta: Meta<typeof LocationSelect> = {
  title: "Components/LocationSelect",
  component: LocationSelect,
  args: {
    options: [
      { value: "Las Vegas|USA", label: "Las Vegas, USA" },
      { value: "New York|USA", label: "New York, USA" },
      { value: "London|United Kingdom", label: "London, United Kingdom" },
    ],
    value: "Las Vegas|USA",
    onChange: fn(),
  },
} satisfies Meta<typeof LocationSelect>;

export default meta;

type Story = StoryObj<typeof LocationSelect>;

export const Default: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const trigger = canvas.getByRole("combobox", { name: "City" });
    await expect(trigger).toHaveTextContent("Las Vegas, USA");

    await userEvent.click(trigger);
    await userEvent.click(
      await screen.findByRole("option", { name: "London, United Kingdom" }),
    );

    await expect(args.onChange).toHaveBeenCalledWith("London|United Kingdom");
  },
};
