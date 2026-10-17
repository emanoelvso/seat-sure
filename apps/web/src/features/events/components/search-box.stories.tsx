import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect } from "storybook/test";
import { SearchBox } from "./search-box";

const meta: Meta<typeof SearchBox> = {
  title: "Features/Events/SearchBox",
  component: SearchBox,
  parameters: { nextjs: { appDirectory: true } },
} satisfies Meta<typeof SearchBox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("form", { name: "Search events" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Search" })).toBeVisible();
  },
};

export const SearchesWithEveryField: Story = {
  play: async ({ canvas, userEvent }) => {
    const concerts = canvas.getByRole("button", { name: "Concerts" });
    await userEvent.click(concerts);
    await expect(concerts).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByLabelText("Event Type")).toHaveValue("CONCERT");

    await userEvent.type(canvas.getByLabelText("Location"), "Paris");
    await userEvent.type(canvas.getByLabelText("Date"), "2026-10-01");
    await userEvent.click(canvas.getByRole("button", { name: "Search" }));

    await expect(getRouter().push).toHaveBeenLastCalledWith(
      "/events?type=CONCERT&city=Paris&from=2026-10-01&to=2026-10-01",
    );
  },
};

export const SearchesWithoutFilters: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Search" }));
    await expect(getRouter().push).toHaveBeenLastCalledWith("/events");
  },
};
