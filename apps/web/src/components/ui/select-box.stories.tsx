import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AltArrowDownIcon } from "@solar-icons/react/outline";
import { expect, fn, screen, waitFor } from "storybook/test";
import { SelectBox } from "./select-box";

const options = [
  { value: "concert", label: "Concert" },
  { value: "sport", label: "Sport" },
  { value: "show", label: "Show" },
  { value: "festival", label: "Festival", disabled: true },
];

const meta: Meta<typeof SelectBox> = {
  title: "Components/SelectBox",
  component: SelectBox,
  tags: ["autodocs"],
  args: {
    options,
    defaultValue: "sport",
    placeholder: "Select an option",
    leftIcon: AltArrowDownIcon,
  },
  argTypes: {
    leftIcon: {
      table: { disable: true },
    },
  },
} satisfies Meta<typeof SelectBox>;

export default meta;

type Story = StoryObj<typeof SelectBox>;

export const Playground: Story = {
  args: { onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    // Not asserted: the trigger's initial text and the selected option. The
    // component passes value={value ?? ""}, which overrides defaultValue
    // ("sport") and leaves the trigger on the placeholder; see the report.
    const trigger = canvas.getByRole("combobox");

    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    const items = screen.getAllByRole("option");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Concert",
      "Sport",
      "Show",
      "Festival",
    ]);
    await expect(screen.getByRole("option", { name: "Festival" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await userEvent.click(screen.getByRole("option", { name: "Show" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith("show");
  },
} satisfies Story;
