import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import { PhoneCodeSelect } from "./phone-code-select";

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const onChange = fn();

function Controlled({ initial = "+1" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <PhoneCodeSelect
      value={value}
      onChange={(code) => {
        onChange(code);
        setValue(code);
      }}
    />
  );
}

const meta: Meta<typeof PhoneCodeSelect> = {
  title: "Features/Account/PhoneCodeSelect",
  component: PhoneCodeSelect,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  beforeEach: () => {
    onChange.mockClear();
  },
  render: () => <Controlled />,
} satisfies Meta<typeof PhoneCodeSelect>;

export default meta;

type Story = StoryObj<typeof PhoneCodeSelect>;

// PROFILE-07 AC 1 and 2: the trigger is named, shows "+1" by default; the
// menu lists +1, +49, +34, +33 in order, each with a flag.
export const Options: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("combobox", {
      name: "Phone country code",
    });
    await expect(trigger).toHaveTextContent("+1");

    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    const options = screen.getAllByRole("option");
    await expect(options.map((option) => option.textContent)).toEqual([
      "+1",
      "+49",
      "+34",
      "+33",
    ]);
    for (const option of options) {
      await expect(option.querySelector("svg")).not.toBeNull();
    }

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  },
};

// PROFILE-07 AC 3: picking +49 shows it on the trigger, closes the menu and
// reports it through onChange.
export const PickClosesAndReports: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("combobox", {
      name: "Phone country code",
    });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "+49" }));

    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await expect(trigger).toHaveTextContent("+49");
    await expect(trigger.querySelector("svg")).not.toBeNull();
    await expect(onChange).toHaveBeenCalledTimes(1);
    await expect(onChange).toHaveBeenCalledWith("+49");
  },
};
