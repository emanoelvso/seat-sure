import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { useRef } from "react";
import { CodeInput, type CodeInputHandle } from "./code-input";

const meta: Meta<typeof CodeInput> = {
  title: "Features/Auth/CodeInput",
  tags: ["autodocs"],
  component: CodeInput,
} satisfies Meta<typeof CodeInput>;

export default meta;

type Story = StoryObj<typeof CodeInput>;

// AUTH-16: a non-digit character leaves the box unchanged.
export const RejectsNonDigit: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent }) => {
    const box1 = canvas.getByLabelText("Digit 1");

    await userEvent.type(box1, "a");

    await expect(box1).toHaveValue("");
  },
};

// AUTH-17: a digit typed into a box that isn't the last moves focus to the
// next box.
export const AdvancesFocusOnDigit: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent }) => {
    const box1 = canvas.getByLabelText("Digit 1");
    const box2 = canvas.getByLabelText("Digit 2");

    await userEvent.type(box1, "5");

    await expect(box1).toHaveValue("5");
    await expect(box2).toHaveFocus();
  },
};

// AUTH-18: Backspace in an empty box that isn't the first clears the
// previous box and moves focus to it.
export const BackspaceClearsPreviousBox: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent }) => {
    const box1 = canvas.getByLabelText("Digit 1");
    const box2 = canvas.getByLabelText("Digit 2");
    const box3 = canvas.getByLabelText("Digit 3");

    await userEvent.type(box1, "5");
    await userEvent.type(box2, "2");
    // box3 is now focused and empty; Backspace there clears box2.
    await userEvent.type(box3, "{Backspace}");

    await expect(box2).toHaveValue("");
    await expect(box2).toHaveFocus();
  },
};

// AUTH-18 boundary case: Backspace in an empty box 2 clears box 1 and
// moves focus to it. The middle-box case above (box3 -> box2) alone can
// pass even if a subtly wrong index check breaks this first-box boundary
// (e.g. an off-by-one that only re-enables Backspace-back from box 3
// onward), so this is covered separately.
export const BackspaceClearsFirstBox: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent }) => {
    const box1 = canvas.getByLabelText("Digit 1");
    const box2 = canvas.getByLabelText("Digit 2");

    await userEvent.type(box1, "5");
    // box2 is now focused and empty; Backspace there clears box1.
    await userEvent.type(box2, "{Backspace}");

    await expect(box1).toHaveValue("");
    await expect(box1).toHaveFocus();
  },
};

// AUTH-19: pasting a 6-digit string into any box fills all 6 boxes in
// order, and onChange receives the full code.
export const PasteFillsAllBoxes: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    const box4 = canvas.getByLabelText("Digit 4");

    await userEvent.click(box4);
    await userEvent.paste("527655");

    await expect(canvas.getByLabelText("Digit 1")).toHaveValue("5");
    await expect(canvas.getByLabelText("Digit 2")).toHaveValue("2");
    await expect(canvas.getByLabelText("Digit 3")).toHaveValue("7");
    await expect(canvas.getByLabelText("Digit 4")).toHaveValue("6");
    await expect(canvas.getByLabelText("Digit 5")).toHaveValue("5");
    await expect(canvas.getByLabelText("Digit 6")).toHaveValue("5");
    await expect(args.onChange).toHaveBeenLastCalledWith("527655");
  },
};

// clear() via ref empties every box and focuses box 1 again.
export const ClearViaRef: Story = {
  render: (args) => {
    function Wrapper() {
      const ref = useRef<CodeInputHandle>(null);
      return (
        <div>
          <CodeInput ref={ref} onChange={args.onChange} />
          <button type="button" onClick={() => ref.current?.clear()}>
            Clear
          </button>
        </div>
      );
    }
    return <Wrapper />;
  },
  args: {
    onChange: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    const box4 = canvas.getByLabelText("Digit 4");
    await userEvent.click(box4);
    await userEvent.paste("527655");

    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));

    await expect(canvas.getByLabelText("Digit 1")).toHaveValue("");
    await expect(canvas.getByLabelText("Digit 1")).toHaveFocus();
    await expect(args.onChange).toHaveBeenLastCalledWith("");
  },
};
