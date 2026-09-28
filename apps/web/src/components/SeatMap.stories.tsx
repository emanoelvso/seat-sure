import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import SeatMap from "./SeatMap";
import { concentricSeatMap, multiShapeSeatMap } from "./SeatMap.fixture";

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
        Array.from(section.querySelectorAll("path"), (path) =>
          path.getAttribute("d"),
        ),
      ),
    ).toEqual(
      concentricSeatMap.sections.map((section) =>
        section.shapes.map((shape) => shape.path),
      ),
    );
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

export const MultiShapeSection: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip", "b.gold"],
  },
  play: async ({ canvas }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));

    const vip = map.getAllByRole("button", { name: "Section VIP" });
    await expect(vip).toHaveLength(1);
    await expect(
      Array.from(vip[0].querySelectorAll("path"), (path) =>
        path.getAttribute("d"),
      ),
    ).toEqual([
      "M60 100L120 100L120 200L60 200Z",
      "M280 100L340 100L340 200L280 200Z",
    ]);
  },
};

export const RotatedLabels: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip", "b.gold"],
  },
  play: async ({ canvas }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));
    const vip = map.getByRole("button", { name: "Section VIP" });

    await expect(
      Array.from(vip.querySelectorAll("text"), (text) => [
        text.textContent,
        text.getAttribute("x"),
        text.getAttribute("y"),
        text.getAttribute("transform"),
        text.getAttribute("font-size"),
        text.getAttribute("font-weight"),
      ]),
    ).toEqual([
      ["VIP", "90", "150", "rotate(-90 90 150)", "16", "400"],
      ["VIP", "310", "152", "rotate(90 310 152)", "16", "400"],
    ]);
  },
};

export const StageWithoutLabel: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip", "b.gold"],
  },
  play: async ({ canvas }) => {
    const svg = canvas.getByRole("group", { name: "Seat map" });
    const outsideSections = (selector: string) =>
      Array.from(svg.querySelectorAll(selector)).filter(
        (element) => !element.closest('[role="button"]'),
      );

    await expect(
      outsideSections("path").map((path) => [
        path.getAttribute("d"),
        path.getAttribute("fill"),
      ]),
    ).toEqual([
      ["M140 110L260 110L260 190L140 190Z", "#999999"],
      ["M140 95L260 95L260 105L140 105Z", "#454545"],
    ]);
    await expect(outsideSections("text")).toHaveLength(0);
  },
};
