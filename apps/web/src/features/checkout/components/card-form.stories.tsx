import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import type { CardInput } from "@/utils/card";
import { CardForm } from "./card-form";

const emptyCard: CardInput = { number: "", holder: "", expiry: "", cvv: "" };

const meta: Meta<typeof CardForm> = {
  title: "Features/Checkout/CardForm",
  tags: ["autodocs"],
  component: CardForm,
  args: {
    value: emptyCard,
    onChange: fn(),
    onSubmit: fn(),
  },
  // CardForm is controlled: the story keeps the value in state, like the
  // checkout view does, and still reports every change to the arg spy.
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value);
    return (
      <CardForm
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof CardForm>;

export default meta;

type Story = StoryObj<typeof CardForm>;

// PAY-26, PAY-27: "Payment details", the four labelled fields and a
// disabled "Review order" while the form is empty.
export const Fields: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Payment details" }),
    ).toBeVisible();

    const number = canvas.getByLabelText("Card number");
    await expect(number).toHaveAttribute("inputmode", "numeric");
    await expect(number).toHaveAttribute("autocomplete", "cc-number");
    await expect(canvas.getByLabelText("Card holder")).toBeVisible();
    await expect(canvas.getByLabelText("MM/YY")).toBeVisible();
    await expect(canvas.getByLabelText("CVV")).toBeVisible();

    await expect(
      canvas.getByRole("button", { name: "Review order" }),
    ).toBeDisabled();
  },
};

// PAY-29, PAY-30: digits group in blocks of 4 and a valid number shows the
// labelled check.
export const Formatting: Story = {
  play: async ({ canvas, userEvent }) => {
    const number = canvas.getByLabelText("Card number");
    await expect(
      canvas.queryByRole("img", { name: "Valid card number" }),
    ).toBeNull();

    await userEvent.type(number, "4242424242424242");

    await expect(number).toHaveValue("4242 4242 4242 4242");
    await expect(
      canvas.getByRole("img", { name: "Valid card number" }),
    ).toBeVisible();
  },
};

// PAY-29: at most 19 digits are kept.
export const MaxLength: Story = {
  play: async ({ canvas, userEvent }) => {
    const number = canvas.getByLabelText("Card number");

    await userEvent.type(number, "1234567890123456789012345");

    await expect(number).toHaveValue("1234 5678 9012 3456 789");
  },
};

// PAY-28: an invalid, non-empty field shows its exact error once it loses
// focus, not while typing. An empty field shows nothing on blur.
export const BlurErrors: Story = {
  play: async ({ canvas, userEvent }) => {
    const number = canvas.getByLabelText("Card number");

    await userEvent.click(number);
    await userEvent.tab();
    await expect(canvas.queryByText("Enter a valid card number")).toBeNull();

    await userEvent.type(number, "4242424242424241");
    await expect(canvas.queryByText("Enter a valid card number")).toBeNull();
    await userEvent.tab();
    await expect(canvas.getByText("Enter a valid card number")).toBeVisible();
    await expect(number).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(canvas.getByLabelText("Card holder"), "N");
    await userEvent.tab();
    await expect(canvas.getByText("Enter the name on the card")).toBeVisible();

    await userEvent.type(canvas.getByLabelText("MM/YY"), "1330");
    await userEvent.tab();
    await expect(canvas.getByText("Enter a valid expiry date")).toBeVisible();

    await userEvent.type(canvas.getByLabelText("CVV"), "12");
    await userEvent.tab();
    await expect(canvas.getByText("Enter a valid CVV")).toBeVisible();
  },
};

// PAY-31: CVV is masked by default and the toggle reveals/masks it,
// renaming itself.
export const CvvToggle: Story = {
  play: async ({ canvas, userEvent }) => {
    const cvv = canvas.getByLabelText("CVV");
    await expect(cvv).toHaveAttribute("type", "password");

    await userEvent.click(canvas.getByRole("button", { name: "Show CVV" }));
    await expect(cvv).toHaveAttribute("type", "text");
    await expect(canvas.getByRole("button", { name: "Hide CVV" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Show CVV" })).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Hide CVV" }));
    await expect(cvv).toHaveAttribute("type", "password");
  },
};

// PAY-32: the card preview follows every keystroke.
export const LivePreview: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Card")).toBeVisible();

    const number = canvas.getByLabelText("Card number");
    await userEvent.type(number, "4");
    await expect(canvas.getByText("Visa")).toBeVisible();
    await userEvent.type(number, "24242424242424");
    await expect(canvas.getByText("•••• •••• •••• 2424")).toBeInTheDocument();
    await userEvent.type(number, "2");
    await expect(canvas.getByText("•••• •••• •••• 4242")).toBeInTheDocument();

    const holder = canvas.getByLabelText("Card holder");
    await userEvent.type(holder, "N");
    await expect(canvas.getByText("N")).toBeVisible();
    await userEvent.type(holder, "e");
    await expect(canvas.getByText("Ne")).toBeVisible();

    await userEvent.type(canvas.getByLabelText("MM/YY"), "0830");
    await expect(canvas.getByText("08 / 30")).toBeVisible();
  },
};

// PAY-27, PAY-33: a fully valid card enables "Review order", which submits.
export const ValidCard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const reviewOrder = canvas.getByRole("button", { name: "Review order" });

    await userEvent.type(canvas.getByLabelText("Card number"), "4242424242424242");
    await userEvent.type(canvas.getByLabelText("Card holder"), "Negar Khosravi");
    await userEvent.type(canvas.getByLabelText("MM/YY"), "0830");
    await expect(reviewOrder).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("CVV"), "123");

    await expect(args.onChange).toHaveBeenLastCalledWith({
      number: "4242 4242 4242 4242",
      holder: "Negar Khosravi",
      expiry: "08/30",
      cvv: "123",
    });
    await expect(reviewOrder).toBeEnabled();

    await userEvent.click(reviewOrder);
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

// PAY-52: a server field error shows under its field without a blur.
export const ServerErrors: Story = {
  args: {
    value: {
      number: "4000 0000 0000 0002",
      holder: "Negar Khosravi",
      expiry: "08/30",
      cvv: "123",
    },
    errors: { number: "Enter a valid card number" },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Enter a valid card number")).toBeVisible();
    await expect(canvas.getByLabelText("Card number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};
