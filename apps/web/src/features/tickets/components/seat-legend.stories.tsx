import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SeatLegend } from "./seat-legend";

const meta: Meta<typeof SeatLegend> = {
  title: "Features/Tickets/SeatLegend",
  component: SeatLegend,
  decorators: [
    (Story) => (
      <div style={{ width: 808 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatLegend>;

export default meta;

type Story = StoryObj<typeof SeatLegend>;

// Each item's glyph has the chart's color for that state: white,
// neutral-300 and primary.
export const Default: Story = {
  play: async ({ canvas }) => {
    const items = within(
      canvas.getByRole("list", { name: "Seat legend" }),
    ).getAllByRole("listitem");

    await expect(
      items.map((item) => [
        item.textContent,
        getComputedStyle(item.querySelector("path")!).fill,
      ]),
    ).toEqual([
      ["Available", "rgb(255, 255, 255)"],
      ["Unavailable", "rgb(69, 69, 69)"],
      ["Selected", "rgb(193, 79, 230)"],
    ]);
  },
};
