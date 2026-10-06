import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { BirthDatePicker } from "./birth-date-picker";

// Fixed clock so the assertions do not depend on the day the tests run.
const TODAY = "2023-08-30";
const onChange = fn();

function Controlled({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <BirthDatePicker
      value={value}
      today={TODAY}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const meta: Meta<typeof BirthDatePicker> = {
  title: "Features/Account/BirthDatePicker",
  component: BirthDatePicker,
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  beforeEach: () => onChange.mockClear(),
  decorators: [
    (Story) => (
      <div className="w-[548px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BirthDatePicker>;

export default meta;

type Story = StoryObj<typeof BirthDatePicker>;

const openCalendar = async (
  canvas: ReturnType<typeof within>,
  userEvent: { click: (element: Element) => Promise<void> },
) => {
  await userEvent.click(canvas.getByRole("button", { name: /Date of birth/ }));
  return await screen.findByRole("dialog");
};

const closeCalendar = async () =>
  waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

// PROFILE-08 AC 1 (PROFILE-03 view): the field shows the value as
// MM/DD/YYYY, and nothing when empty.
export const FieldDisplay: Story = {
  render: () => <Controlled initial="1995-08-17" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Date of birth/ }),
    ).toHaveTextContent("08/17/1995");
  },
};

// Pickers AC 4 and 5: the calendar opens on the value's month, with month
// and year selectors, a Sunday-first weekday header and the three actions.
export const OpensOnValueMonth: Story = {
  render: () => <Controlled initial="1995-03-17" />,
  play: async ({ canvas, userEvent }) => {
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await expect(
      calendar.getByRole("combobox", { name: "Month" }),
    ).toHaveTextContent("Mar");
    await expect(
      calendar.getByRole("combobox", { name: "Year" }),
    ).toHaveTextContent("1995");
    const weekdays = Array.from(dialog.querySelectorAll("thead th")).map(
      (header) => header.textContent,
    );
    await expect(weekdays).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
    await expect(calendar.getByRole("button", { name: "Clear" })).toBeVisible();
    await expect(
      calendar.getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    await expect(calendar.getByRole("button", { name: "OK" })).toBeVisible();
  },
};

// Pickers AC 5: an empty field opens on the current month.
export const OpensOnCurrentMonthWhenEmpty: Story = {
  render: () => <Controlled initial="" />,
  play: async ({ canvas, userEvent }) => {
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await expect(
      calendar.getByRole("combobox", { name: "Month" }),
    ).toHaveTextContent("Aug");
    await expect(
      calendar.getByRole("combobox", { name: "Year" }),
    ).toHaveTextContent("2023");
  },
};

// Pickers AC 6: days after today are disabled, today is not.
export const FutureDaysDisabled: Story = {
  render: () => <Controlled initial="" />,
  play: async ({ canvas, userEvent }) => {
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await expect(
      calendar.getByRole("button", { name: /August 31st, 2023/ }),
    ).toBeDisabled();
    await expect(
      calendar.getByRole("button", { name: /August 30th, 2023/ }),
    ).toBeEnabled();
  },
};

// Pickers AC 6: no year before 1900 is offered, and the previous-year arrow
// stops at 1900.
export const YearsStartAt1900: Story = {
  render: () => <Controlled initial="1900-01-01" />,
  play: async ({ canvas, userEvent }) => {
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await expect(
      calendar.getByRole("button", { name: "Previous year" }),
    ).toBeDisabled();
    await userEvent.click(calendar.getByRole("combobox", { name: "Year" }));
    const years = (await screen.findAllByRole("option")).map((option) =>
      Number(option.textContent),
    );
    await expect(Math.min(...years)).toBe(1900);
    await expect(Math.max(...years)).toBe(2023);
    await userEvent.keyboard("{Escape}");
  },
};

// Pickers AC 7 and 8: a day click only highlights; OK applies it as
// MM/DD/YYYY and closes the calendar.
export const OkAppliesDraft: Story = {
  render: () => <Controlled initial="1995-08-10" />,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("button", { name: /Date of birth/ });
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await userEvent.click(
      calendar.getByRole("button", { name: /August 17th, 1995/ }),
    );
    await expect(field).toHaveTextContent("08/10/1995");
    await expect(onChange).not.toHaveBeenCalled();
    await expect(
      calendar.getByRole("button", { name: /August 17th, 1995/ }).closest("td"),
    ).toHaveAttribute("aria-selected", "true");

    await userEvent.click(calendar.getByRole("button", { name: "OK" }));
    await closeCalendar();
    await expect(field).toHaveTextContent("08/17/1995");
    await expect(onChange).toHaveBeenCalledWith("1995-08-17");
  },
};

// Pickers AC 9: Cancel closes and keeps the previous value.
export const CancelKeepsValue: Story = {
  render: () => <Controlled initial="1995-08-10" />,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("button", { name: /Date of birth/ });
    const dialog = await openCalendar(canvas, userEvent);
    const calendar = within(dialog);

    await userEvent.click(
      calendar.getByRole("button", { name: /August 17th, 1995/ }),
    );
    await userEvent.click(calendar.getByRole("button", { name: "Cancel" }));
    await closeCalendar();
    await expect(field).toHaveTextContent("08/10/1995");
    await expect(onChange).not.toHaveBeenCalled();
  },
};

// Pickers AC 10: Clear empties the field and closes.
export const ClearEmptiesField: Story = {
  render: () => <Controlled initial="1995-08-10" />,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("button", { name: /Date of birth/ });
    const dialog = await openCalendar(canvas, userEvent);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Clear" }),
    );
    await closeCalendar();
    await expect(field).not.toHaveTextContent("1995");
    await expect(field.textContent).toBe("");
    await expect(onChange).toHaveBeenCalledWith("");
  },
};
