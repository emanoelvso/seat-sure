import { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { expect, fn, screen, waitFor } from "storybook/test";
import { OrderSortMenu } from "./order-sort-menu";

type UrlUpdates = ReturnType<typeof fn<OnUrlUpdateFunction>>;

// a11y "error" makes the addon's violations fail the story (preview.tsx
// only reports them).
const storyParameters = (searchParams = "") => ({
  nuqs: { searchParams, onUrlUpdate: fn<OnUrlUpdateFunction>() },
  a11y: { test: "error" },
});

const urlUpdates = (parameters: Record<string, unknown>) =>
  (parameters.nuqs as { onUrlUpdate: UrlUpdates }).onUrlUpdate;

const meta: Meta<typeof OrderSortMenu> = {
  title: "Features/Account/OrderSortMenu",
  component: OrderSortMenu,
  tags: ["autodocs"],
  parameters: storyParameters(),
  decorators: [
    (Story) => (
      <div className="flex justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderSortMenu>;

export default meta;

type Story = StoryObj<typeof OrderSortMenu>;

// ORDLIST-04 AC 7: opening "Sort by" shows the four options, in order.
export const Options: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Sort by" }));

    await screen.findByRole("listbox");
    const options = screen.getAllByRole("option");
    await expect(options.map((option) => option.textContent)).toEqual([
      "Newest first",
      "Oldest first",
      "Highest amount",
      "Lowest amount",
    ]);

    // Close it: while open, Radix aria-hides the rest of the page (trigger
    // included), which the a11y scan after play() would report.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  },
};

// ORDLIST-04 AC 8: picking an option writes `sort` and drops `page` (back to
// 1), on the server (shallow: false) without a history entry.
export const PickResetsPage: Story = {
  parameters: storyParameters("?status=pending&page=2"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Sort by" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Highest amount" }),
    );

    await waitFor(() =>
      expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1),
    );
    const { searchParams, options } = urlUpdates(parameters).mock.lastCall![0];
    await expect(searchParams.get("sort")).toBe("highest");
    await expect(searchParams.has("page")).toBe(false);
    await expect(searchParams.get("status")).toBe("pending");
    await expect(options.shallow).toBe(false);
    await expect(options.history).toBe("replace");
  },
};
