import { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { EventsFilters } from "./events-filters";

type Canvas = ReturnType<typeof within>;
type UrlUpdates = ReturnType<typeof fn<OnUrlUpdateFunction>>;

const ALL_FILTERS =
  "?type=SHOW&city=Paris&price=100-300&from=2026-10-01&to=2026-10-05&page=3";

// Seeds the URL and spies on its updates (see .storybook/preview.tsx).
const urlState = (searchParams: string) => ({
  nuqs: { searchParams, onUrlUpdate: fn<OnUrlUpdateFunction>() },
});

const urlUpdates = (parameters: Record<string, unknown>) =>
  (parameters.nuqs as { onUrlUpdate: UrlUpdates }).onUrlUpdate;

const lastUpdate = (parameters: Record<string, unknown>) =>
  urlUpdates(parameters).mock.lastCall![0];

// The filter control whose fieldset legend is `label`.
const control = (canvas: Canvas, label: string) =>
  within(canvas.getByRole("group", { name: label }));

const pillsRow = (canvas: Canvas) =>
  within(canvas.getByText("your search:").parentElement!);

const pills = (canvas: Canvas) =>
  pillsRow(canvas)
    .queryAllByRole("button")
    .map((pill) => pill.textContent);

const meta: Meta<typeof EventsFilters> = {
  title: "Features/Events/EventsFilters",
  component: EventsFilters,
  args: { cities: ["Paris", "Lyon", "Berlin"] },
} satisfies Meta<typeof EventsFilters>;

export default meta;

type Story = StoryObj<typeof EventsFilters>;

export const LoadedFromUrl: Story = {
  parameters: urlState(ALL_FILTERS),
  play: async ({ canvas }) => {
    await expect(control(canvas, "What").getByRole("combobox")).toHaveTextContent(
      /^Show$/,
    );
    await expect(control(canvas, "When").getByRole("button")).toHaveTextContent(
      "Oct 1 - Oct 5, 2026",
    );
    await expect(control(canvas, "Where").getByRole("textbox")).toHaveValue(
      "Paris",
    );
    await expect(
      control(canvas, "Price").getByRole("combobox"),
    ).toHaveTextContent("$100-300$");

    await expect(pills(canvas)).toEqual([
      "Shows",
      "Oct 1 - Oct 5, 2026",
      "Paris",
      "$100-300$",
    ]);
  },
};

export const ChipsShowCloseIcon: Story = {
  parameters: urlState(ALL_FILTERS),
  play: async ({ canvas }) => {
    const chips = pillsRow(canvas).getAllByRole("button");

    await expect(
      chips.map((chip) => [
        chip.textContent,
        within(chip).queryAllByTestId("close-icon").length,
      ]),
    ).toEqual([
      ["Shows", 1],
      ["Oct 1 - Oct 5, 2026", 1],
      ["Paris", 1],
      ["$100-300$", 1],
    ]);
  },
};

export const NoFilters: Story = {
  play: async ({ canvas }) => {
    await expect(control(canvas, "When").getByRole("button")).toHaveTextContent(
      "Select dates",
    );
    await expect(pills(canvas)).toEqual([]);
  },
};

export const ChooseType: Story = {
  parameters: urlState("?type=SHOW&page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(control(canvas, "What").getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Concert" }));

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1));
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("type")).toBe("CONCERT");
    await expect(searchParams.has("page")).toBe(false);
    await expect(options.shallow).toBe(false);
    await expect(options.history).toBe("replace");
  },
};

export const PickCity: Story = {
  parameters: urlState("?type=SHOW&page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(control(canvas, "Where").getByRole("textbox"));
    await userEvent.click(await screen.findByRole("button", { name: "Lyon" }));

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1));
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("city")).toBe("Lyon");
    await expect(searchParams.get("type")).toBe("SHOW");
    await expect(searchParams.has("page")).toBe(false);
    await expect(options.shallow).toBe(false);
    await expect(options.history).toBe("replace");
  },
};

export const PickPrice: Story = {
  parameters: urlState("?type=SHOW&page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(control(canvas, "Price").getByRole("combobox"));
    await userEvent.click(
      await screen.findByRole("option", { name: "$300-$500" }),
    );

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1));
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("price")).toBe("300-500");
    await expect(searchParams.get("type")).toBe("SHOW");
    await expect(searchParams.has("page")).toBe(false);
    await expect(options.shallow).toBe(false);
    await expect(options.history).toBe("replace");
  },
};

// The picker opens on the current month, so the story picks two of its days
// and reads their calendar dates from the grid.
export const PickDateRange: Story = {
  parameters: urlState("?type=SHOW&page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(control(canvas, "When").getByRole("button"));
    const grid = await screen.findByRole("grid");
    const days = [
      ...grid.querySelectorAll<HTMLElement>("[data-day]:not([data-outside])"),
    ].map((cell) => cell.dataset.day!);
    const [start, end] = [days[2], days[6]];
    const dayButton = (day: string) =>
      within(
        screen.getByRole("grid").querySelector<HTMLElement>(`[data-day="${day}"]`)!,
      ).getByRole("button");

    await userEvent.click(dayButton(start));
    await userEvent.click(dayButton(end));

    await waitFor(() =>
      expect(lastUpdate(parameters).searchParams.get("to")).toBe(end),
    );
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("from")).toBe(start);
    await expect(searchParams.get("type")).toBe("SHOW");
    await expect(searchParams.has("page")).toBe(false);
    await expect(options.shallow).toBe(false);
    await expect(options.history).toBe("replace");
  },
};

export const RemovePills: Story = {
  parameters: urlState(ALL_FILTERS),
  play: async ({ canvas, userEvent, parameters }) => {
    const remaining = new Set(["type", "from", "to", "city", "price"]);
    const removals: [string, string[]][] = [
      ["Shows", ["type"]],
      ["Oct 1 - Oct 5, 2026", ["from", "to"]],
      ["Paris", ["city"]],
      ["$100-300$", ["price"]],
    ];

    for (const [pill, params] of removals) {
      await userEvent.click(pillsRow(canvas).getByRole("button", { name: pill }));
      params.forEach((param) => remaining.delete(param));

      // Only the other filters are left, and `page` is gone.
      await waitFor(() =>
        expect([...lastUpdate(parameters).searchParams.keys()].sort()).toEqual(
          [...remaining].sort(),
        ),
      );
    }

    await expect(pills(canvas)).toEqual([]);
  },
};
