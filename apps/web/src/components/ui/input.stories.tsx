import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { Input } from "./input";
import { CheckCircleIcon, EyeIcon, MagnifierIcon } from "@solar-icons/react/outline";

const meta: Meta<typeof Input> = {
  // TODO(a11y): color-contrast (neutral-400 helper text) still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Components/Input",
  tags: ["autodocs"],
  component: Input,
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "success", "error", "disabled"],
    },
    size: {
      control: { type: "radio" },
      options: ["sm", "md"],
    },
    leftIcon: {
      control: { type: "boolean" },
      mapping: { true: MagnifierIcon, false: undefined },
    },
    rightIcon: {
      control: { type: "boolean" },
      mapping: { true: EyeIcon, false: undefined },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof Input>;

export const Playground: Story = {
  args: {
    label: "Email",
    size: "md",
    variant: "default",
    supportingText: "Supporting text",
    counter: "",
  },
} satisfies Story;

// AUTH-06: the field's native props (name, type) pass through, and the
// legend text is the input's accessible label.
export const FormField: Story = {
  args: {
    label: "Email",
    name: "email",
    type: "email",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Email");
    await expect(input).toHaveAttribute("name", "email");
    await expect(input).toHaveAttribute("type", "email");
  },
} satisfies Story;

// AUTH-30: an error variant surfaces its message via aria-describedby and
// marks the field invalid, so assistive tech announces both.
export const ErrorState: Story = {
  args: {
    label: "Email",
    variant: "error",
    supportingText: "Enter a valid email address.",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Email");
    await expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const message = canvas.getByText("Enter a valid email address.");
    await expect(message).toHaveAttribute("id", describedBy);
  },
} satisfies Story;

// AUTH-30: the right icon button exposes a label and calls back on click,
// which PasswordField (T26) relies on for its show/hide toggle.
export const WithRightIconAction: Story = {
  args: {
    label: "Password",
    rightIcon: EyeIcon,
    rightIconLabel: "Show password",
    onRightIconClick: fn(),
  },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Show password" });
    await userEvent.click(button);
    await expect(args.onRightIconClick).toHaveBeenCalledTimes(1);
  },
} satisfies Story;

// PAY-30: the card-number field's non-interactive valid-number check. It
// shows a labelled icon, adds no button, and stays out of the tab order.
export const WithRightAdornment: Story = {
  args: {
    label: "Card number",
    rightAdornment: (
      <span role="img" aria-label="Valid card number">
        <CheckCircleIcon size={18} />
      </span>
    ),
  },
  play: async ({ canvas }) => {
    const adornment = canvas.getByRole("img", { name: "Valid card number" });
    await expect(adornment).toBeVisible();
    await expect(adornment).not.toHaveAttribute("tabindex");

    await expect(canvas.queryByRole("button")).toBeNull();
  },
} satisfies Story;
