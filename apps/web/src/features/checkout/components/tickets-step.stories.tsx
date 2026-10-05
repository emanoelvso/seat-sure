import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { TicketsStep } from "./tickets-step";

const meta: Meta<typeof TicketsStep> = {
  title: "Features/Checkout/TicketsStep",
  tags: ["autodocs"],
  component: TicketsStep,
  args: { quantity: 2, onConfirm: fn() },
} satisfies Meta<typeof TicketsStep>;

export default meta;

type Story = StoryObj<typeof TicketsStep>;

// PAY-04, PAY-18: the copy and a read-only quantity - no select to change it.
export const ReadOnlyQuantity: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "Make sure the number of tickets is correct before proceeding.",
      ),
    ).toBeVisible();

    const term = canvas.getByRole("term");
    await expect(term).toHaveTextContent("Ticket quantity");
    await expect(canvas.getByRole("definition")).toHaveTextContent(/^2$/);

    await expect(canvas.queryByRole("combobox")).toBeNull();
    await expect(canvas.queryByRole("listbox")).toBeNull();
    await expect(canvas.queryByRole("spinbutton")).toBeNull();
  },
};

// PAY-24: "Confirm" calls onConfirm.
export const Confirm: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

// PAY-04: the start page keeps "Confirm" disabled behind its modal.
export const Disabled: Story = {
  args: { confirmDisabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeDisabled();
  },
};
