import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useQueryState, parseAsString } from "nuqs";
import { useState } from "react";
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

export const ControlsHaveAccessibleNames: Story = {
  parameters: urlState("?type=SHOW&price=100-300&from=2026-10-01&to=2026-10-05"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "What" })).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Price" })).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Where" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /^When/ })).toHaveAccessibleName(
      "When Oct 1 - Oct 5, 2026",
    );
    for (const label of ["What", "When", "Where", "Price"]) {
      await expect(canvas.getByRole("group", { name: label })).toBeVisible();
    }
  },
};

export const WhenNameWithoutDates: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^When/ })).toHaveAccessibleName(
      "When Select dates",
    );
  },
};

export const WhenLegendHasSameMarginAsOthers: Story = {
  play: async ({ canvas }) => {
    const legend = (label: string) =>
      within(canvas.getByRole("group", { name: label })).getByText(label);
    await expect(legend("When")).toHaveClass("ml-3");
    await expect(legend("When")).not.toHaveClass("ml-e");
  },
};

export const TabOrder: Story = {
  play: async ({ canvas, userEvent }) => {
    for (const control of [
      canvas.getByRole("combobox", { name: "What" }),
      canvas.getByRole("button", { name: /^When/ }),
      canvas.getByRole("textbox", { name: "Where" }),
      canvas.getByRole("combobox", { name: "Price" }),
    ]) {
      await userEvent.tab();
      await expect(control).toHaveFocus();
    }
  },
};

export const KeyboardSelectType: Story = {
  parameters: urlState("?page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    canvas.getByRole("combobox", { name: "What" }).focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1));
    await expect(lastUpdate(parameters).searchParams.get("type")).toBe("SHOW");
  },
};

export const KeyboardSelectPrice: Story = {
  parameters: urlState("?page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    canvas.getByRole("combobox", { name: "Price" }).focus();
    await userEvent.keyboard(" ");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1));
    await expect(lastUpdate(parameters).searchParams.get("price")).toBe("100-300");
  },
};

export const KeyboardOpensAndClosesCalendar: Story = {
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: /^When/ });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("grid");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    await expect(button).toHaveFocus();
  },
};

const DEBOUNCE_MS = 300;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cityUpdates = (parameters: Record<string, unknown>) =>
  urlUpdates(parameters).mock.calls.map(([update]) => update.searchParams.get("city"));

export const TypedTextShowsImmediately: Story = {
  parameters: urlState(""),
  play: async ({ canvas, userEvent, parameters }) => {
    const input = canvas.getByRole("textbox", { name: "Where" });
    await userEvent.type(input, "Par");

    await expect(input).toHaveValue("Par");
    await expect(urlUpdates(parameters)).not.toHaveBeenCalled();
  },
};

export const TypingBurstUpdatesUrlOnce: Story = {
  parameters: urlState("?type=SHOW&page=3"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "Paris");
    await expect(urlUpdates(parameters)).not.toHaveBeenCalled();

    await waitFor(() => expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1), {
      timeout: 1500,
    });
    await sleep(DEBOUNCE_MS + 200);

    await expect(cityUpdates(parameters)).toEqual(["Paris"]);
    const { searchParams, options } = lastUpdate(parameters);
    await expect(searchParams.get("type")).toBe("SHOW");
    await expect(searchParams.has("page")).toBe(false);
    await expect(options.history).toBe("replace");
  },
};

export const UpdateWaitsForTheFullPause: Story = {
  parameters: urlState(""),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "Par");
    await sleep(DEBOUNCE_MS / 2);
    await expect(urlUpdates(parameters)).not.toHaveBeenCalled();

    await waitFor(() => expect(cityUpdates(parameters)).toEqual(["Par"]), {
      timeout: DEBOUNCE_MS,
    });
  },
};

export const SuggestionDiscardsPendingTypedUpdate: Story = {
  parameters: urlState(""),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "Pa");
    await userEvent.click(await screen.findByRole("button", { name: "Paris" }));
    await sleep(DEBOUNCE_MS + 200);

    await expect(cityUpdates(parameters)).toEqual(["Paris"]);
  },
};

export const SeparateBurstsUpdateTwice: Story = {
  parameters: urlState(""),
  play: async ({ canvas, userEvent, parameters }) => {
    const input = canvas.getByRole("textbox", { name: "Where" });
    await userEvent.type(input, "Pa");
    await sleep(DEBOUNCE_MS + 200);
    await userEvent.type(input, "ris");
    await sleep(DEBOUNCE_MS + 200);

    await expect(cityUpdates(parameters)).toEqual(["Pa", "Paris"]);
  },
};

export const SuggestionAppliesImmediately: Story = {
  parameters: urlState(""),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(canvas.getByRole("textbox", { name: "Where" }));
    await userEvent.click(await screen.findByRole("button", { name: "Lyon" }));

    await expect(cityUpdates(parameters)).toEqual(["Lyon"]);
    await sleep(DEBOUNCE_MS + 200);
    await expect(cityUpdates(parameters)).toEqual(["Lyon"]);
  },
};

export const EmptyingTheBoxDropsCity: Story = {
  parameters: urlState("?city=Paris&type=SHOW"),
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.clear(canvas.getByRole("textbox", { name: "Where" }));
    await sleep(DEBOUNCE_MS + 200);

    await expect(urlUpdates(parameters)).toHaveBeenCalledTimes(1);
    const { searchParams } = lastUpdate(parameters);
    await expect(searchParams.has("city")).toBe(false);
    await expect(searchParams.get("type")).toBe("SHOW");
  },
};

export const PillKeepsAppliedCityWhilePending: Story = {
  parameters: urlState("?city=Paris"),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "x");

    await expect(pills(canvas)).toEqual(["Paris"]);
    await waitFor(() => expect(pills(canvas)).toEqual(["Parisx"]), { timeout: 1500 });
  },
};

export const NoMatchShowsEmptyListWhilePending: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "zzz");

    await expect(await screen.findByText("No cities found")).toBeVisible();
  },
};

export const LoadedCityShowsInBoxAndPill: Story = {
  parameters: urlState("?city=Paris"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Where" })).toHaveValue("Paris");
    await expect(pills(canvas)).toEqual(["Paris"]);
  },
};

// Stands in for back/forward: another writer changes the URL city.
function NavigateTo({ city }: { city: string }) {
  const [, setCity] = useQueryState("city", parseAsString);
  return <button onClick={() => setCity(city)}>Navigate to {city}</button>;
}

export const NavigationBeatsPendingUpdate: Story = {
  parameters: urlState("?city=Paris"),
  render: (args) => (
    <>
      <NavigateTo city="Berlin" />
      <EventsFilters {...args} />
    </>
  ),
  play: async ({ canvas, userEvent, parameters }) => {
    const input = canvas.getByRole("textbox", { name: "Where" });
    await userEvent.type(input, "Lyon");
    await userEvent.click(canvas.getByRole("button", { name: "Navigate to Berlin" }));

    await expect(input).toHaveValue("Berlin");
    await sleep(DEBOUNCE_MS + 200);
    await expect(input).toHaveValue("Berlin");
    await expect(cityUpdates(parameters)).not.toContain("ParisLyon");
    await expect(pills(canvas)).toEqual(["Berlin"]);
  },
};

export const UnmountCancelsPendingUpdate: Story = {
  parameters: urlState(""),
  render: function Render(args) {
    const [mounted, setMounted] = useState(true);
    return (
      <>
        <button onClick={() => setMounted(false)}>Leave</button>
        {mounted && <EventsFilters {...args} />}
      </>
    );
  },
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: "Where" }), "Par");
    await userEvent.click(canvas.getByRole("button", { name: "Leave" }));
    await sleep(DEBOUNCE_MS + 200);

    await expect(urlUpdates(parameters)).not.toHaveBeenCalled();
  },
};
