import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import SeatMap from "./SeatMap";
import { concentricSeatMap } from "@/testing/seat-map.fixture";

const meta: Meta<typeof SeatMap> = {
  title: "Components/SeatMap",
  component: SeatMap,
  args: {
    layout: concentricSeatMap,
    enabledKeys: ["vip", "a", "b", "c"],
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 704 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatMap>;

export default meta;

type Story = StoryObj<typeof SeatMap>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));

    await expect(map.getByText("STAGE")).toBeVisible();

    const sections = map.getAllByRole("button");
    await expect(
      sections.map((section) => section.getAttribute("aria-label")),
    ).toEqual(["Section VIP", "Section A", "Section B", "Section C"]);
    await expect(sections.map((section) => section.textContent)).toEqual([
      "VIP",
      "A",
      "B",
      "C",
    ]);
    await expect(
      sections.map((section) =>
        section.querySelector("path")?.getAttribute("d"),
      ),
    ).toEqual(concentricSeatMap.sections.map((section) => section.path));
  },
};

export const SelectByPointerAndKeyboard: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));

    await userEvent.tab();
    await expect(
      map.getByRole("button", { name: "Section VIP" }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(map.getByRole("button", { name: "Section A" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).toHaveBeenLastCalledWith("a");

    await userEvent.tab();
    await userEvent.tab();
    await expect(map.getByRole("button", { name: "Section C" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(args.onSelect).toHaveBeenLastCalledWith("c");

    await userEvent.click(map.getByRole("button", { name: "Section B" }));
    await expect(args.onSelect).toHaveBeenLastCalledWith("b");

    await expect(args.onSelect).toHaveBeenCalledTimes(3);
  },
};

export const Selected: Story = {
  args: { selectedKey: "b" },
  play: async ({ canvas }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));

    await expect(
      map
        .getAllByRole("button")
        .map((section) => [
          section.getAttribute("aria-label"),
          section.getAttribute("aria-pressed"),
        ]),
    ).toEqual([
      ["Section VIP", "false"],
      ["Section A", "false"],
      ["Section B", "true"],
      ["Section C", "false"],
    ]);
  },
};

export const DisabledSection: Story = {
  args: { enabledKeys: ["vip", "a", "b"] },
  play: async ({ canvas, args, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));

    await expect(
      map
        .getAllByRole("button")
        .map((section) => [
          section.getAttribute("aria-label"),
          section.getAttribute("aria-disabled"),
        ]),
    ).toEqual([
      ["Section VIP", "false"],
      ["Section A", "false"],
      ["Section B", "false"],
      ["Section C", "true"],
    ]);

    const c = map.getByRole("button", { name: "Section C" });
    await userEvent.click(c);
    c.focus();
    await userEvent.keyboard("{Enter}");

    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};
