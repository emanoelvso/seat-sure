import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { WhyChooseSection } from "./why-choose-section";

const meta: Meta<typeof WhyChooseSection> = {
  title: "Features/About/WhyChooseSection",
  component: WhyChooseSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WhyChooseSection>;

export default meta;

type Story = StoryObj<typeof WhyChooseSection>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Why Choose SeatSure?" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Experience excellence with a team that truly cares"),
    ).toBeVisible();

    const cardTitles = canvas.getAllByRole("heading", { level: 3 });
    await expect(cardTitles.map((title) => title.textContent)).toEqual([
      "Your Ticket is on the Way!",
      "Online Ticket Purchasing",
      "Customer Support",
      "Event Discovery",
    ]);

    for (const description of [
      "We’re sending your ticket straight to your email. Just confirm your name and email below, and you’re all set for an unforgettable experience! 🚀",
      "Allows users to browse events, select seats, and buy tickets instantly via secure payment methods 🎭",
      "24/7 live chat, email, or phone support for booking issues.🌟",
      "Personalized suggestions based on user preferences, location, and past bookings Filters for categories venues, and price ranges. The goal is to detect meaningful occurrences (events) in analysis, or automated responses.💰",
    ]) {
      await expect(canvas.getByText(description)).toBeVisible();
    }

    // Empty alts make the illustrations presentational, so query them by selector.
    const illustrations = canvasElement.querySelectorAll("img");
    // Four card illustrations plus the phone frame behind the envelope.
    await expect(illustrations).toHaveLength(5);
    for (const illustration of illustrations) {
      await expect(illustration).toHaveAttribute("alt", "");
    }

    await expect(canvasElement).not.toHaveTextContent(/Evenjo/);
  },
} satisfies Story;
