import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { GqlTicketType } from "@/graphql/queries/find-event-tickets";
import SeatMap, { SeatMapPreview } from "./SeatMap";
import { concentricSeatMap, multiShapeSeatMap } from "@/testing/seat-map.fixture";

const offer = (
  sectionKey: string,
  name: string,
  priceCents: number,
): GqlTicketType => ({
  id: `tt-${sectionKey}`,
  sectionKey,
  name,
  priceCents,
  currency: "USD",
  seatsAvailable: 100,
  maxPerOrder: 8,
  tags: [],
});

// Every section has a distinct price, so a tooltip for the wrong section
// can't pass for the right one. Offer names differ from the map labels, so
// the tooltip shows which one it reads (STAD-07 uses the ticket type name).
const multiShapeOffers = {
  "t.gold": offer("t.gold", "Gold Top", 32500),
  vip: offer("vip", "VIP Box", 40000),
  "b.gold": offer("b.gold", "Gold Bottom", 30000),
};

const pathFills = (section: Element) =>
  Array.from(section.querySelectorAll("path"), (path) =>
    path.getAttribute("fill"),
  );

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

export const HoverShowsPriceTooltip: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip", "b.gold"],
    offers: multiShapeOffers,
  },
  play: async ({ canvas, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));
    const tGold = map.getByRole("button", { name: "Section T.GOLD" });

    await userEvent.hover(tGold.querySelectorAll("path")[1]);

    const tooltip = await canvas.findByRole("tooltip");
    await expect(canvas.getAllByRole("tooltip")).toHaveLength(1);
    await expect(within(tooltip).getByText("Gold Top seat")).toBeVisible();
    await expect(within(tooltip).getByText("$325")).toBeVisible();
    // Anchored at the hovered (second) block's label point: 252.5/400, 51/300.
    await expect(tooltip.style.left).toBe("63.125%");
    await expect(tooltip.style.top).toBe("17%");

    await userEvent.unhover(tGold.querySelectorAll("path")[1]);

    await expect(canvas.queryByRole("tooltip")).toBeNull();
  },
};

export const FocusShowsPriceTooltip: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip", "b.gold"],
    offers: multiShapeOffers,
  },
  play: async ({ canvas, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));
    const tGold = map.getByRole("button", { name: "Section T.GOLD" });
    const vip = map.getByRole("button", { name: "Section VIP" });

    await userEvent.tab();
    await userEvent.tab();
    await expect(vip).toHaveFocus();

    const tooltip = await canvas.findByRole("tooltip");
    await expect(within(tooltip).getByText("VIP Box seat")).toBeVisible();
    await expect(within(tooltip).getByText("$400")).toBeVisible();
    await expect(tooltip.id).not.toBe("");
    await expect(vip.getAttribute("aria-describedby")).toBe(tooltip.id);
    await expect(tGold).not.toHaveAttribute("aria-describedby");

    (vip as unknown as HTMLElement).blur();

    await expect(vip).not.toHaveFocus();
    await expect(canvas.queryByRole("tooltip")).toBeNull();
    await expect(vip).not.toHaveAttribute("aria-describedby");
  },
};

export const DisabledSectionHasNoTooltip: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip"],
    // B.GOLD has an offer, so only its disabled state hides the tooltip.
    offers: multiShapeOffers,
  },
  play: async ({ canvas, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));
    const bGold = map.getByRole("button", { name: "Section B.GOLD" });

    await userEvent.hover(bGold.querySelector("path")!);
    await expect(canvas.queryByRole("tooltip")).toBeNull();
    await userEvent.unhover(bGold.querySelector("path")!);

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(bGold).toHaveFocus();
    await expect(canvas.queryByRole("tooltip")).toBeNull();
    await expect(bGold).not.toHaveAttribute("aria-describedby");

    // The same pointer path does show a tooltip on an enabled section.
    await userEvent.hover(
      map.getByRole("button", { name: "Section VIP" }).querySelector("path")!,
    );
    await expect(
      within(await canvas.findByRole("tooltip")).getByText("VIP Box seat"),
    ).toBeVisible();
  },
};

export const PressedAndHoverColors: Story = {
  args: {
    layout: multiShapeSeatMap,
    enabledKeys: ["t.gold", "vip"],
    selectedKey: "vip",
    offers: multiShapeOffers,
  },
  play: async ({ canvas, userEvent }) => {
    const map = within(canvas.getByRole("group", { name: "Seat map" }));
    const tGold = map.getByRole("button", { name: "Section T.GOLD" });
    const vip = map.getByRole("button", { name: "Section VIP" });
    const bGold = map.getByRole("button", { name: "Section B.GOLD" });

    await expect(pathFills(tGold)).toEqual(["#303030", "#303030"]);
    await expect(pathFills(vip)).toEqual([
      "var(--color-shade-100)",
      "var(--color-shade-100)",
    ]);

    await userEvent.hover(tGold.querySelectorAll("path")[0]);

    await expect(pathFills(tGold)).toEqual([
      "var(--color-shade-200)",
      "var(--color-shade-200)",
    ]);
    await expect(pathFills(vip)).toEqual([
      "var(--color-shade-100)",
      "var(--color-shade-100)",
    ]);
    await expect(pathFills(bGold)).toEqual(["#1F1F1F"]);

    // Pressed and hovered at once keeps the pressed color.
    await userEvent.hover(vip.querySelectorAll("path")[1]);

    await expect(pathFills(vip)).toEqual([
      "var(--color-shade-100)",
      "var(--color-shade-100)",
    ]);
    await expect(pathFills(tGold)).toEqual(["#303030", "#303030"]);

    // B.GOLD is disabled: hovering it doesn't tint it.
    await userEvent.hover(bGold.querySelector("path")!);

    await expect(pathFills(bGold)).toEqual(["#1F1F1F"]);
    await expect(pathFills(tGold)).toEqual(["#303030", "#303030"]);
  },
};

const allPathFills = (svg: Element) =>
  Array.from(svg.querySelectorAll("path"), (path) => path.getAttribute("fill"));

export const PreviewHighlightsSection: Story = {
  render: () => <SeatMapPreview layout={concentricSeatMap} highlightKey="b" />,
  play: async ({ canvas }) => {
    const preview = canvas.getByRole("img", {
      name: "Section B on the seat map",
    });

    // Stage, VIP, A, B, C in drawing order: only B uses the pressed color.
    await expect(allPathFills(preview)).toEqual([
      "#999999",
      "#454545",
      "#303030",
      "var(--color-shade-100)",
      "#191919",
    ]);
  },
};

export const PreviewIsNotInteractive: Story = {
  render: () => <SeatMapPreview layout={concentricSeatMap} highlightKey="b" />,
  play: async ({ canvas }) => {
    const preview = canvas.getByRole("img", {
      name: "Section B on the seat map",
    });

    await expect(
      preview.querySelectorAll('button, [tabindex], [role="button"]'),
    ).toHaveLength(0);
  },
};

export const PreviewUnknownSection: Story = {
  render: () => <SeatMapPreview layout={concentricSeatMap} highlightKey="z" />,
  play: async ({ canvas }) => {
    const preview = canvas.getByRole("img", { name: "Seat map" });

    await expect(allPathFills(preview)).toEqual([
      "#999999",
      "#454545",
      "#303030",
      "#1F1F1F",
      "#191919",
    ]);
  },
};
