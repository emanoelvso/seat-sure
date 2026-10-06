import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StoryTimeline } from "./story-timeline";

const meta: Meta<typeof StoryTimeline> = {
  title: "Features/About/StoryTimeline",
  component: StoryTimeline,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StoryTimeline>;

export default meta;

type Story = StoryObj<typeof StoryTimeline>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", {
        level: 2,
        name: "What is the story of SeatSure?",
      }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Every great journey begins with a single step—this is ours",
      ),
    ).toBeVisible();

    const timeline = canvas.getByRole("list");
    await expect(timeline.tagName).toBe("OL");

    const steps = within(timeline).getAllByRole("listitem");
    const stepNames = [
      "Research & Discovery",
      "Experience Design",
      "Platform Development",
      "Launch & Growth",
    ];
    await expect(steps).toHaveLength(stepNames.length);
    for (const [index, name] of stepNames.entries()) {
      await expect(within(steps[index]).getByText(name)).toBeVisible();
    }

    // The step icons are decoration.
    const icons = timeline.querySelectorAll("svg.solar");
    await expect(icons).toHaveLength(4);
    for (const icon of icons) {
      await expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
    }

    await expect(canvasElement).not.toHaveTextContent(/Evenjo/);
  },
} satisfies Story;
