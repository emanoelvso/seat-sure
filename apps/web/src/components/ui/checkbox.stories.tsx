import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  tags: ["autodocs"],
  component: Checkbox,
  args: {
    label: "Remember me",
    name: "rememberMe",
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof Checkbox>;

// AUTH-01: unchecked by default.
export const Default: Story = {
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox", { name: "Remember me" });
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
  },
} satisfies Story;

// AUTH-29: clicking the label (not just the box) toggles the checkbox.
export const ClickLabelToggles: Story = {
  args: {
    onCheckedChange: fn(),
  },
  play: async ({ canvas, args, userEvent }) => {
    const checkbox = canvas.getByRole("checkbox", { name: "Remember me" });
    await expect(checkbox).toHaveAttribute("aria-checked", "false");

    await userEvent.click(canvas.getByText("Remember me"));

    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
  },
} satisfies Story;

// AUTH-29: works as a real form field — submitting FormData only includes
// the value when checked.
export const InAForm: Story = {
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        (event.currentTarget as HTMLFormElement & { reportValue?: string }).dataset.value =
          String(data.get("rememberMe"));
      }}
    >
      <Checkbox {...args} />
      <button type="submit">Submit</button>
    </form>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const checkbox = canvas.getByRole("checkbox", { name: "Remember me" });
    const form = canvasElement.querySelector("form") as HTMLFormElement;
    const submit = () => canvas.getByRole("button", { name: "Submit" }).click();

    submit();
    await expect(form.dataset.value).toBe("null");

    await userEvent.click(checkbox);
    submit();
    await expect(form.dataset.value).toBe("on");
  },
} satisfies Story;
