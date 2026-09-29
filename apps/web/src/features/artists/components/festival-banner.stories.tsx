import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { EventSummary } from "@/types/api";
import { zonedIso } from "@/testing/dates";
import { FestivalBanner } from "./festival-banner";

const festival: EventSummary = {
  id: "f1",
  name: "Music Festival",
  description: "Mehdi Lorestani with DJ Hamed",
  coverImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
  venue: "Las Vegas Festival Grounds",
  city: "Las Vegas",
  country: "USA",
  date: zonedIso(2026, 10, 20),
  startAt: zonedIso(2026, 10, 20, 18, 0),
  price: 199,
  category: "Electronic",
};

const meta: Meta<typeof FestivalBanner> = {
  title: "Components/FestivalBanner",
  component: FestivalBanner,
  args: { event: festival },
  decorators: [
    (Story) => (
      <div style={{ width: 912 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FestivalBanner>;

export default meta;

type Story = StoryObj<typeof FestivalBanner>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("in Las Vegas")).toBeVisible();
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Music Festival" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Mehdi Lorestani with DJ Hamed"),
    ).toBeVisible();
    await expect(canvas.getByRole("link")).toHaveAttribute(
      "href",
      "/events/f1/tickets",
    );
  },
};
