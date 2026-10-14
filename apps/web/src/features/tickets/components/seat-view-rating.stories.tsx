import { EyeClosedIcon, EyeIcon } from "@solar-icons/react/outline";
import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { SeatViewRating } from "./seat-view-rating";

const meta: Meta<typeof SeatViewRating> = {
  title: "Features/Tickets/SeatViewRating",
  component: SeatViewRating,
  args: {
    sectionName: "VIP",
    view: { score: 4.7, label: "Clear View" },
  },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SeatViewRating>;

export default meta;

type Story = StoryObj<typeof SeatViewRating>;

const pathsOf = (element: Element) =>
  [...element.querySelectorAll("path")].map((path) => path.getAttribute("d"));

// The rendered icon draws the Solar eye, not the crossed-out eye (L-010).
// The references render next to the card so the comparison uses the same
// icon set the card imports.
export const RatedSection: Story = {
  render: (args) => (
    <>
      <SeatViewRating {...args} />
      <div data-testid="eye-reference">
        <EyeIcon size={18} />
      </div>
      <div data-testid="eye-closed-reference">
        <EyeClosedIcon size={18} />
      </div>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Section VIP selected")).toBeVisible();
    await expect(canvas.getByText("4.7")).toBeVisible();
    await expect(canvas.getByText("Great")).toBeVisible();
    await expect(canvas.getByText("Clear View")).toBeVisible();

    const icon = canvas.getByTestId("eye-icon");

    await expect(pathsOf(icon)).toEqual(
      pathsOf(canvas.getByTestId("eye-reference")),
    );
    await expect(pathsOf(icon)).not.toEqual(
      pathsOf(canvas.getByTestId("eye-closed-reference")),
    );
  },
};

export const WholeScoreHasOneDecimal: Story = {
  args: { view: { score: 4, label: "Side View" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("4.0")).toBeVisible();
    await expect(canvas.getByText("Good")).toBeVisible();
    await expect(canvas.getByText("Side View")).toBeVisible();
  },
};

export const LowScoreIsFair: Story = {
  args: { view: { score: 3.2, label: "Partial View" } },
  play: async ({ canvas }) => {
    const card = within(
      canvas.getByText("Section VIP selected").parentElement!,
    );

    await expect(card.getByText("3.2")).toBeVisible();
    await expect(canvas.getByText("Fair")).toBeVisible();
  },
};
