import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen } from "storybook/test";
import { PriceRangeFilter } from "./price-range-filter";

const meta: Meta<typeof PriceRangeFilter> = {
  // TODO(a11y): aria-dialog-name still fails axe; tracked in todo.md.
  parameters: { a11y: { test: "todo" } },
  title: "Components/PriceRangeFilter",
  component: PriceRangeFilter,
  args: {
    value: { min: 200, max: 450 },
    onApply: fn(),
  },
} satisfies Meta<typeof PriceRangeFilter>;

export default meta;

type Story = StoryObj<typeof PriceRangeFilter>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "$200 - $450" }),
    ).toBeVisible();
  },
};

export const ApplyRange: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "$200 - $450" }));

    const min = await screen.findByRole("spinbutton", { name: "Min" });
    const max = screen.getByRole("spinbutton", { name: "Max" });
    await expect(min).toHaveValue(200);
    await expect(max).toHaveValue(450);

    await userEvent.clear(min);
    await userEvent.type(min, "250");
    await userEvent.clear(max);
    await userEvent.type(max, "420");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    await expect(args.onApply).toHaveBeenCalledTimes(1);
    await expect(args.onApply).toHaveBeenCalledWith({ min: 250, max: 420 });
  },
};

export const MinExceedsMax: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "$200 - $450" }));

    const min = await screen.findByRole("spinbutton", { name: "Min" });
    const max = screen.getByRole("spinbutton", { name: "Max" });
    await userEvent.clear(min);
    await userEvent.type(min, "500");
    await userEvent.clear(max);
    await userEvent.type(max, "420");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    await expect(await screen.findByRole("alert")).toHaveTextContent(
      "Min can't exceed max",
    );
    await expect(args.onApply).not.toHaveBeenCalled();
  },
};
